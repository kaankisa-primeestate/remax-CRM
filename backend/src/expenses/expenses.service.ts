import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, Repository } from 'typeorm';
import { Expense } from './expense.entity';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { BankTransaction, BankTransactionType } from '../bank-accounts/bank-transaction.entity';
import { BankAccount } from '../bank-accounts/bank-account.entity';
import { AgentLedgerAdjustment, LedgerAdjustmentType } from '../agent-ledger/agent-ledger-adjustment.entity';

const CATEGORY_LABELS: Record<string, string> = {
  rent: 'Kira',
  utility: 'Fatura',
  salary: 'Maaş',
  marketing: 'Pazarlama',
  supplies: 'Ofis Malzemesi',
  other: 'Diğer',
};

@Injectable()
export class ExpensesService {
  constructor(
    @InjectRepository(Expense) private readonly expenseRepo: Repository<Expense>,
    @InjectRepository(BankTransaction) private readonly bankTransactionRepo: Repository<BankTransaction>,
    @InjectRepository(AgentLedgerAdjustment) private readonly adjustmentRepo: Repository<AgentLedgerAdjustment>,
    @InjectRepository(BankAccount) private readonly bankAccountRepo: Repository<BankAccount>,
  ) {}

  async create(dto: CreateExpenseDto): Promise<Expense> {
    const expense = this.expenseRepo.create(dto);
    const saved = await this.expenseRepo.save(expense);

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

    if (dto.chargebacks && dto.chargebacks.length > 0) {
      for (const cb of dto.chargebacks) {
        if (cb.agentId && Number(cb.amount) > 0) {
          const adjustment = this.adjustmentRepo.create({
            agentId: cb.agentId,
            type: LedgerAdjustmentType.DEBIT,
            amount: cb.amount,
            description: `Masraf Yansıtması: ${dto.title}`,
            date: dto.date,
            source: 'expense',
            sourceId: saved.id,
          });
          await this.adjustmentRepo.save(adjustment);
        }
      }
    } else if (dto.agentId && dto.chargebackPercentage && dto.chargebackPercentage > 0) {
      const chargebackAmount = (Number(dto.amount) * Number(dto.chargebackPercentage)) / 100;
      const adjustment = this.adjustmentRepo.create({
        agentId: dto.agentId,
        type: LedgerAdjustmentType.DEBIT,
        amount: chargebackAmount,
        description: `Masraf Yansıtması (%${dto.chargebackPercentage}): ${dto.title}`,
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

  // Kategori bazli ozet -- "bu ay nereye ne harcamisim" sorusuna cevap.
  // Secilen donem (from-to) ile bir ONCEKI ayni uzunluktaki donemi
  // karsilastirip, artis yuzdesini de dondurur (siskinlik gostergesi
  // icin temel olusturur, ileride kullanilacak).
  async getSummaryByCategory(from: string, to: string): Promise<
    { category: string; label: string; total: number; count: number; previousTotal: number }[]
  > {
    const expenses = await this.expenseRepo.find({ where: { date: Between(from, to) } });

    // Karsilastirma icin bir onceki, AYNI uzunlukta donem
    const fromDate = new Date(from);
    const toDate = new Date(to);
    const spanMs = toDate.getTime() - fromDate.getTime();
    const prevTo = new Date(fromDate.getTime() - 1);
    const prevFrom = new Date(prevTo.getTime() - spanMs);
    const previousExpenses = await this.expenseRepo.find({
      where: { date: Between(prevFrom.toISOString().slice(0, 10), prevTo.toISOString().slice(0, 10)) },
    });

    const byCategory = new Map<string, { total: number; count: number }>();
    for (const e of expenses) {
      const entry = byCategory.get(e.category) || { total: 0, count: 0 };
      entry.total += Number(e.amount);
      entry.count += 1;
      byCategory.set(e.category, entry);
    }
    const prevByCategory = new Map<string, number>();
    for (const e of previousExpenses) {
      prevByCategory.set(e.category, (prevByCategory.get(e.category) || 0) + Number(e.amount));
    }

    return Array.from(byCategory.entries())
      .map(([category, { total, count }]) => ({
        category,
        label: CATEGORY_LABELS[category] || category,
        total,
        count,
        previousTotal: prevByCategory.get(category) || 0,
      }))
      .sort((a, b) => b.total - a.total);
  }

  // Bir kategorinin TAM dokumu -- her kalemin tarihi, tutari, HANGI
  // kasa/banka hesabindan odendigi bilgisiyle. Tam sayfa detay ekraninda
  // kullanilir (pop-up degil).
  async getCategoryDetail(category: string, from: string, to: string): Promise<
    { id: string; title: string; amount: number; date: string; bankAccountName: string | null; notes: string | null }[]
  > {
    const expenses = await this.expenseRepo.find({
      where: { category: category as any, date: Between(from, to) },
      order: { date: 'DESC' },
    });
    const bankAccountIds = [...new Set(expenses.map((e) => e.bankAccountId).filter(Boolean))] as string[];
    const accounts = bankAccountIds.length
      ? await this.bankAccountRepo.find({ where: { id: In(bankAccountIds) } })
      : [];
    const accountNameById = new Map(accounts.map((a) => [a.id, `${a.bankName} - ${a.accountName}`]));

    return expenses.map((e) => ({
      id: e.id,
      title: e.title,
      amount: Number(e.amount),
      date: e.date,
      bankAccountName: e.bankAccountId ? accountNameById.get(e.bankAccountId) || null : null,
      notes: e.notes,
    }));
  }

  async remove(id: string): Promise<void> {
    const expense = await this.expenseRepo.findOne({ where: { id } });
    if (!expense) {
      throw new NotFoundException('Gider bulunamadı');
    }

    await this.bankTransactionRepo.delete({ source: 'expense', sourceId: id });
    await this.adjustmentRepo.delete({ source: 'expense', sourceId: id });
    await this.expenseRepo.remove(expense);
  }
}
