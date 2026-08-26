import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChequeNote, ChequeNoteStatus, ChequeNoteDirection } from './cheque-note.entity';
import { CreateChequeNoteDto } from './dto/create-cheque-note.dto';
import { UpdateChequeNoteDto } from './dto/update-cheque-note.dto';
import { BankTransaction, BankTransactionType } from '../bank-accounts/bank-transaction.entity';

@Injectable()
export class ChequeNotesService {
  constructor(
    @InjectRepository(ChequeNote) private readonly repo: Repository<ChequeNote>,
    @InjectRepository(BankTransaction) private readonly bankTransactionRepo: Repository<BankTransaction>,
  ) {}

  async create(dto: CreateChequeNoteDto): Promise<ChequeNote> {
    const chequeNote = this.repo.create({ ...dto, status: ChequeNoteStatus.PORTFOLIO });
    return this.repo.save(chequeNote);
  }

  async findAll(): Promise<ChequeNote[]> {
    return this.repo.find({ order: { dueDate: 'ASC' } });
  }

  async update(id: string, dto: UpdateChequeNoteDto): Promise<ChequeNote> {
    const chequeNote = await this.repo.findOne({ where: { id } });
    if (!chequeNote) {
      throw new NotFoundException('Çek/Senet kaydı bulunamadı');
    }

    const wasCollected = chequeNote.status === ChequeNoteStatus.COLLECTED;
    Object.assign(chequeNote, dto);
    const saved = await this.repo.save(chequeNote);

    // Durum "Tahsil Edildi/Odendi" oldu VE bir banka hesabi secildiyse,
    // otomatik bir banka hareketi olustur -- boylece bakiye elle tekrar
    // girmeye gerek kalmadan senkron kalir. RECEIVABLE (alacak) ise
    // giris, PAYABLE (borc) ise cikis.
    const justCollected = !wasCollected && saved.status === ChequeNoteStatus.COLLECTED;
    if (justCollected && saved.bankAccountId) {
      // Ayni kayit icin tekrar tekrar hareket olusmasin diye once temizle.
      await this.bankTransactionRepo.delete({ source: 'cheque_note', sourceId: saved.id });
      const transaction = this.bankTransactionRepo.create({
        bankAccountId: saved.bankAccountId,
        type: saved.direction === ChequeNoteDirection.RECEIVABLE ? BankTransactionType.DEPOSIT : BankTransactionType.WITHDRAWAL,
        amount: saved.amount,
        date: new Date().toISOString().slice(0, 10),
        description: `${saved.type === 'cheque' ? 'Çek' : 'Senet'} tahsilatı: ${saved.drawerName}`,
        source: 'cheque_note',
        sourceId: saved.id,
        receiptUrl: saved.receiptUrl || null,
      });
      await this.bankTransactionRepo.save(transaction);
    }
    // Durum "Tahsil Edildi"den baska bir seye geri alindiysa, olusan
    // banka hareketini de temizle -- tutarlilik icin.
    if (wasCollected && saved.status !== ChequeNoteStatus.COLLECTED) {
      await this.bankTransactionRepo.delete({ source: 'cheque_note', sourceId: saved.id });
    }

    return saved;
  }

  async remove(id: string): Promise<void> {
    const chequeNote = await this.repo.findOne({ where: { id } });
    if (!chequeNote) {
      throw new NotFoundException('Çek/Senet kaydı bulunamadı');
    }
    await this.bankTransactionRepo.delete({ source: 'cheque_note', sourceId: id });
    await this.repo.remove(chequeNote);
  }
}
