import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, IsNull, Not, Repository } from 'typeorm';
import { Expense } from './expense.entity';
import { ExpenseCategoryDefinition } from './expense-category-definition.entity';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { BankTransaction, BankTransactionType } from '../bank-accounts/bank-transaction.entity';
import { BankAccount } from '../bank-accounts/bank-account.entity';
import { AgentLedgerAdjustment, LedgerAdjustmentType } from '../agent-ledger/agent-ledger-adjustment.entity';

// Eski sabit enum degerlerinin varsayilan Turkce etiketleri -- SADECE
// gecmis kayitlari yeni sisteme otomatik tasirken (migrateLegacyCategories)
// kullanilir, artik yeni kategori eklemenin yolu degildir.
const LEGACY_CATEGORY_LABELS: Record<string, string> = {
  rent: 'Kira',
  utility: 'Fatura',
  salary: 'Maaş',
  marketing: 'Pazarlama',
  supplies: 'Ofis Malzemesi',
  other: 'Diğer',
};

// Ilk kurulumda hazir gelen, kullanicinin sikca ihtiyac duyacagi
// kategoriler -- bunlar SADECE bir baslangic noktasi, kullanici
// istedigi kadar YENI kategori ekleyebilir/pasiflestirebilir.
const DEFAULT_CATEGORY_NAMES = [
  'Kira',
  'Elektrik',
  'Su',
  'İnternet',
  'Maaş',
  'Market',
  'Akaryakıt',
  'Müşteri Yemeği',
  'Reklam',
  'Ofis Giderleri',
  'Muhasebe',
  'Yazılım Abonelikleri',
  'Diğer',
];

@Injectable()
export class ExpensesService implements OnModuleInit {
  constructor(
    @InjectRepository(Expense) private readonly expenseRepo: Repository<Expense>,
    @InjectRepository(ExpenseCategoryDefinition) private readonly categoryRepo: Repository<ExpenseCategoryDefinition>,
    @InjectRepository(BankTransaction) private readonly bankTransactionRepo: Repository<BankTransaction>,
    @InjectRepository(AgentLedgerAdjustment) private readonly adjustmentRepo: Repository<AgentLedgerAdjustment>,
    @InjectRepository(BankAccount) private readonly bankAccountRepo: Repository<BankAccount>,
  ) {}

  // Sunucu her baslarken calisir: (1) hic kategori yoksa varsayilanlari
  // olusturur, (2) HALA eski enum'lu ("category" dolu) ama YENI sisteme
  // ("categoryId" bos) hic baglanmamis gecmis giderleri otomatik olarak
  // dogru kategoriye baglar. Idempotent -- her baslangicta calissa bile
  // zaten tasinmis kayitlara DOKUNMAZ, sadece eksik olanlari tamamlar.
  async onModuleInit() {
    try {
      const existingCount = await this.categoryRepo.count();
      if (existingCount === 0) {
        for (const name of DEFAULT_CATEGORY_NAMES) {
          await this.categoryRepo.save(this.categoryRepo.create({ name }));
        }
      }
      await this.migrateLegacyCategories();
    } catch {
      // Baslangicta bu adim basarisiz olsa bile sunucu COKMEMELI --
      // gider modulu disindaki her sey normal calismaya devam etmeli.
    }
  }

  private async migrateLegacyCategories(): Promise<void> {
    const orphaned = await this.expenseRepo.find({
      where: { categoryId: IsNull(), category: Not(IsNull()) },
    });
    if (orphaned.length === 0) return;

    const allCategories = await this.categoryRepo.find();
    const categoryByName = new Map(allCategories.map((c) => [c.name, c]));

    for (const expense of orphaned) {
      const label = LEGACY_CATEGORY_LABELS[expense.category as string] || 'Diğer';
      let category = categoryByName.get(label);
      if (!category) {
        category = await this.categoryRepo.save(this.categoryRepo.create({ name: label }));
        categoryByName.set(label, category);
      }
      expense.categoryId = category.id;
      await this.expenseRepo.save(expense);
    }
  }

  async listCategories(): Promise<ExpenseCategoryDefinition[]> {
    return this.categoryRepo.find({ where: { isActive: true }, order: { name: 'ASC' } });
  }

  async createCategory(name: string): Promise<ExpenseCategoryDefinition> {
    const category = this.categoryRepo.create({ name: name.trim() });
    return this.categoryRepo.save(category);
  }

  async deactivateCategory(id: string): Promise<void> {
    await this.categoryRepo.update(id, { isActive: false });
  }

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
  // Artik categoryId (YENI sistem) uzerinden gruplaniyor.
  async getSummaryByCategory(from: string, to: string): Promise<
    { categoryId: string; label: string; total: number; count: number; previousTotal: number }[]
  > {
    const expenses = await this.expenseRepo.find({ where: { date: Between(from, to) } });

    const fromDate = new Date(from);
    const toDate = new Date(to);
    const spanMs = toDate.getTime() - fromDate.getTime();
    const prevTo = new Date(fromDate.getTime() - 1);
    const prevFrom = new Date(prevTo.getTime() - spanMs);
    const previousExpenses = await this.expenseRepo.find({
      where: { date: Between(prevFrom.toISOString().slice(0, 10), prevTo.toISOString().slice(0, 10)) },
    });

    const allCategories = await this.categoryRepo.find();
    const categoryNameById = new Map(allCategories.map((c) => [c.id, c.name]));

    const byCategory = new Map<string, { total: number; count: number }>();
    for (const e of expenses) {
      const key = e.categoryId || 'uncategorized';
      const entry = byCategory.get(key) || { total: 0, count: 0 };
      entry.total += Number(e.amount);
      entry.count += 1;
      byCategory.set(key, entry);
    }
    const prevByCategory = new Map<string, number>();
    for (const e of previousExpenses) {
      const key = e.categoryId || 'uncategorized';
      prevByCategory.set(key, (prevByCategory.get(key) || 0) + Number(e.amount));
    }

    return Array.from(byCategory.entries())
      .map(([categoryId, { total, count }]) => ({
        categoryId,
        label: categoryId === 'uncategorized' ? 'Kategorisiz' : categoryNameById.get(categoryId) || 'Bilinmeyen',
        total,
        count,
        previousTotal: prevByCategory.get(categoryId) || 0,
      }))
      .sort((a, b) => b.total - a.total);
  }

  // Bir kategorinin TAM dokumu -- her kalemin tarihi, tutari, HANGI
  // kasa/banka hesabindan odendigi bilgisiyle. Tam sayfa detay ekraninda
  // kullanilir (pop-up degil).
  async getCategoryDetail(categoryId: string, from: string, to: string): Promise<
    { id: string; title: string; amount: number; date: string; bankAccountName: string | null; notes: string | null }[]
  > {
    const where =
      categoryId === 'uncategorized'
        ? { categoryId: IsNull(), date: Between(from, to) }
        : { categoryId, date: Between(from, to) };
    const expenses = await this.expenseRepo.find({ where, order: { date: 'DESC' } });
    const bankAccountIds = [...new Set(expenses.map((e) => e.bankAccountId).filter(Boolean))] as string[];
    const accounts = bankAccountIds.length
      ? await this.bankAccountRepo.find({ where: { id: In(bankAccountIds) } })
      : [];
    const accountNameById = new Map(accounts.map((a) => [a.id, a.bankName ? `${a.bankName} - ${a.accountName}` : a.accountName]));

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
