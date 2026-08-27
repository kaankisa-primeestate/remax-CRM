import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { BankAccount, AccountType } from './bank-account.entity';
import { BankTransaction, BankTransactionType } from './bank-transaction.entity';
import { CreateBankAccountDto } from './dto/create-bank-account.dto';
import { UpdateBankAccountDto } from './dto/update-bank-account.dto';
import { CreateTransactionDto } from './dto/create-transaction.dto';

@Injectable()
export class BankAccountsService {
  constructor(
    @InjectRepository(BankAccount) private readonly accountRepo: Repository<BankAccount>,
    @InjectRepository(BankTransaction) private readonly txRepo: Repository<BankTransaction>,
  ) {}

  async create(dto: CreateBankAccountDto): Promise<BankAccount> {
    const account = this.accountRepo.create({
      bankName: dto.bankName || null,
      accountName: dto.accountName,
      iban: dto.iban || null,
      currency: dto.currency || 'TRY',
      type: (dto.type || AccountType.BANK) as AccountType,
    });
    return this.accountRepo.save(account);
  }

  async findAll(): Promise<(BankAccount & { currentBalance: number })[]> {
    const accounts = await this.accountRepo.find({ where: { isActive: true }, order: { createdAt: 'ASC' } });
    const allTxs = await this.txRepo.find();

    return accounts.map((acc) => {
      const txs = allTxs.filter((t) => t.bankAccountId === acc.id);
      const txSum = txs.reduce((sum, t) => {
        const amt = Number(t.amount);
        return t.type === BankTransactionType.DEPOSIT ? sum + amt : sum - amt;
      }, 0);
      const currentBalance = txSum;
      return { ...acc, currentBalance };
    });
  }

  async findOne(id: string): Promise<BankAccount & { currentBalance: number }> {
    const acc = await this.accountRepo.findOne({ where: { id } });
    if (!acc) throw new NotFoundException('Banka hesabı bulunamadı');

    const txs = await this.txRepo.find({ where: { bankAccountId: id } });
    const txSum = txs.reduce((sum, t) => {
      const amt = Number(t.amount);
      return t.type === BankTransactionType.DEPOSIT ? sum + amt : sum - amt;
    }, 0);
    const currentBalance = txSum;
    return { ...acc, currentBalance };
  }

  async update(id: string, dto: UpdateBankAccountDto): Promise<BankAccount> {
    const acc = await this.accountRepo.findOne({ where: { id } });
    if (!acc) throw new NotFoundException('Banka hesabı bulunamadı');

    if (dto.bankName !== undefined) acc.bankName = dto.bankName;
    if (dto.accountName !== undefined) acc.accountName = dto.accountName;
    if (dto.iban !== undefined) acc.iban = dto.iban || null;
    if (dto.currency !== undefined) acc.currency = dto.currency;
    if (dto.type !== undefined) acc.type = dto.type as AccountType;
    if (dto.isActive !== undefined) acc.isActive = dto.isActive;

    return this.accountRepo.save(acc);
  }

  async remove(id: string): Promise<void> {
    const acc = await this.accountRepo.findOne({ where: { id } });
    if (!acc) throw new NotFoundException('Banka hesabı bulunamadı');
    acc.isActive = false;
    await this.accountRepo.save(acc);
  }

  async addTransaction(dto: CreateTransactionDto): Promise<BankTransaction> {
    const acc = await this.accountRepo.findOne({ where: { id: dto.bankAccountId } });
    if (!acc) throw new NotFoundException('Banka hesabı bulunamadı');

    const tx = this.txRepo.create({
      bankAccountId: dto.bankAccountId,
      type: dto.type as BankTransactionType,
      amount: dto.amount,
      date: dto.date,
      description: dto.description || null,
      source: dto.source || 'manual',
      sourceId: dto.sourceId || null,
      receiptUrl: dto.receiptUrl || null,
    });
    return this.txRepo.save(tx);
  }

  async getHistory(bankAccountId: string): Promise<BankTransaction[]> {
    return this.txRepo.find({
      where: { bankAccountId },
      order: { date: 'DESC', createdAt: 'DESC' },
    });
  }

  async getFinanceSummary(from: Date, to: Date) {
    const txs = await this.txRepo.find({
      where: { date: Between(from.toISOString().slice(0, 10), to.toISOString().slice(0, 10)) },
    });

    const incomeBySourceMap: Record<string, number> = {};
    let totalIncome = 0;
    let totalExpense = 0;

    for (const t of txs) {
      const amt = Number(t.amount);
      if (t.type === BankTransactionType.DEPOSIT) {
        totalIncome += amt;
        const srcKey = t.source || 'manual';
        incomeBySourceMap[srcKey] = (incomeBySourceMap[srcKey] || 0) + amt;
      } else {
        totalExpense += amt;
      }
    }

    return {
      totalIncome,
      totalExpense,
      netBalance: totalIncome - totalExpense,
      incomeBySource: incomeBySourceMap,
    };
  }
}
