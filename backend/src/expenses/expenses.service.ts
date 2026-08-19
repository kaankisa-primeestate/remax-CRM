import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Expense } from './expense.entity';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { BankTransaction, BankTransactionType } from '../bank-accounts/bank-transaction.entity';
import { AgentLedgerAdjustment, LedgerAdjustmentType } from '../agent-ledger/agent-ledger-adjustment.entity';

@Injectable()
export class ExpensesService {
  constructor(
    @InjectRepository(Expense) private readonly expenseRepo: Repository<Expense>,
    @InjectRepository(BankTransaction) private readonly bankTransactionRepo: Repository<BankTransaction>,
    @InjectRepository(AgentLedgerAdjustment) private readonly adjustmentRepo: Repository<AgentLedgerAdjustment>,
  ) {}

  async create(dto: CreateExpenseDto): Promise<Expense> {
    const expense = this.expenseRepo.create(dto);
    const saved = await this.expenseRepo.save(expense);

    // Banka hesabi secildiyse, o hesaptan otomatik bir "cikis" hareketi
    // olustur -- boylece banka bakiyesi elle tekrar girmeye gerek kalmadan
    // senkron kalir. Kaynak olarak 'expense' + bu gideri isaretliyoruz,
    // ki gider silinince ayni hareket de silinsin.
    if (dto.bankAccountId) {
      const transaction = this.bankTransactionRepo.create({
        bankAccountId: dto.bankAccountId,
        type: BankTransactionType.WITHDRAWAL,
        amount: dto.amount,
        date: dto.date,
        description: `Gider: ${dto.title}`,
        source: 'expense',
        sourceId: saved.id,
      });
      await this.bankTransactionRepo.save(transaction);
    }

    // Masraf Yansitma: danisman + oran belirtildiyse, o danismanin Cari
    // Hesabina otomatik bir BORC (debit) kaydi olustur -- danisman ofise
    // bu tutar kadar borclanir. Gider silinince bu kayit da otomatik
    // temizlenir (bkz. remove()).
    if (dto.agentId && dto.chargebackPercentage && dto.chargebackPercentage > 0) {
      const chargebackAmount = (Number(dto.amount) * Number(dto.chargebackPercentage)) / 100;
      const adjustment = this.adjustmentRepo.create({
        agentId: dto.agentId,
        type: LedgerAdjustmentType.DEBIT,
        amount: chargebackAmount,
        description: `Masraf yansıtması (%${dto.chargebackPercentage}): ${dto.title}`,
        date: dto.date,
        source: 'expense',
        sourceId: saved.id,
      });
      await this.adjustmentRepo.save(adjustment);
    }

    return saved;
  }

  async findAll(): Promise<Expense[]> {
    return this.expenseRepo.find({ order: { date: 'DESC', createdAt: 'DESC' } });
  }

  async remove(id: string): Promise<void> {
    const expense = await this.expenseRepo.findOne({ where: { id } });
    if (!expense) {
      throw new NotFoundException('Gider bulunamadı');
    }
    // Bu gidere bagli otomatik banka hareketi VE cari hareketi varsa,
    // onlari da temizle -- yoksa banka bakiyesi ve danisman bakiyesi
    // yanlis kalir.
    await this.bankTransactionRepo.delete({ source: 'expense', sourceId: id });
    await this.adjustmentRepo.delete({ source: 'expense', sourceId: id });
    await this.expenseRepo.remove(expense);
  }
}
