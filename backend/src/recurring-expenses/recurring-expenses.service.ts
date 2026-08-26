import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RecurringExpense } from './recurring-expense.entity';
import { Expense } from '../expenses/expense.entity';
import { CreateRecurringExpenseDto } from './dto/create-recurring-expense.dto';
import { UpdateRecurringExpenseDto } from './dto/update-recurring-expense.dto';
import { PayRecurringExpenseDto } from './dto/pay-recurring-expense.dto';
import { ExpensesService } from '../expenses/expenses.service';

export interface PendingRecurringExpense {
  template: RecurringExpense;
  dueDate: string; // YYYY-MM-DD, o donem icin hesaplanmis vade tarihi
  isOverdue: boolean;
}

@Injectable()
export class RecurringExpensesService {
  constructor(
    @InjectRepository(RecurringExpense) private readonly templateRepo: Repository<RecurringExpense>,
    @InjectRepository(Expense) private readonly expenseRepo: Repository<Expense>,
    private readonly expensesService: ExpensesService,
  ) {}

  async create(dto: CreateRecurringExpenseDto): Promise<RecurringExpense> {
    const template = this.templateRepo.create(dto);
    return this.templateRepo.save(template);
  }

  async findAll(): Promise<RecurringExpense[]> {
    return this.templateRepo.find({ order: { dueDayOfMonth: 'ASC', title: 'ASC' } });
  }

  async update(id: string, dto: UpdateRecurringExpenseDto): Promise<RecurringExpense> {
    const template = await this.templateRepo.findOne({ where: { id } });
    if (!template) {
      throw new NotFoundException('Sabit gider şablonu bulunamadı');
    }
    Object.assign(template, dto);
    return this.templateRepo.save(template);
  }

  async remove(id: string): Promise<void> {
    const template = await this.templateRepo.findOne({ where: { id } });
    if (!template) {
      throw new NotFoundException('Sabit gider şablonu bulunamadı');
    }
    // Gecmiste bu sablondan olusmus GERCEK Expense kayitlari SILINMEZ --
    // onlar zaten gerceklesmis para hareketleri, muhasebe gecmisi olarak
    // kalmali. Sadece sablonun kendisi (gelecek beklentisi) kaldirilir.
    await this.templateRepo.remove(template);
  }

  // Belirtilen donem (YYYY-MM) icin, henuz odenmemis (Expense'i
  // olusturulmamis) aktif sablonlari, hesaplanmis vade tarihiyle birlikte
  // dondurur -- "Bekleyen Odemeler" listesi.
  async getPendingForPeriod(period: string): Promise<PendingRecurringExpense[]> {
    const [year, month] = period.split('-').map(Number);
    const templates = await this.templateRepo.find({ where: { isActive: true } });

    const results: PendingRecurringExpense[] = [];
    for (const template of templates) {
      const alreadyPaid = await this.expenseRepo
        .createQueryBuilder('e')
        .where('e.recurringExpenseId = :id', { id: template.id })
        .andWhere("to_char(e.date, 'YYYY-MM') = :period", { period })
        .getCount();
      if (alreadyPaid > 0) continue;

      // Ayin gercek gun sayisina gore vade gununu sinirla (orn. Subat'ta 31 -> 28/29)
      const lastDayOfMonth = new Date(year, month, 0).getDate();
      const day = Math.min(template.dueDayOfMonth, lastDayOfMonth);
      const dueDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isOverdue = new Date(dueDate) < new Date(new Date().toISOString().slice(0, 10));

      results.push({ template, dueDate, isOverdue });
    }
    return results.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }

  // Bir sablonu bu donem icin "odendi" isaretler -- GERCEK bir Expense
  // kaydi olusturur (ExpensesService uzerinden, boylece banka hareketi +
  // masraf yansitma mantigi TEKRAR YAZILMADAN otomatik calisir).
  async pay(id: string, dto: PayRecurringExpenseDto): Promise<Expense> {
    const template = await this.templateRepo.findOne({ where: { id } });
    if (!template) {
      throw new NotFoundException('Sabit gider şablonu bulunamadı');
    }
    return this.expensesService.create({
      categoryId: template.categoryId as string,
      category: template.category || undefined,
      title: template.title,
      amount: dto.amount,
      date: dto.date,
      referenceNo: dto.referenceNo,
      bankAccountId: dto.bankAccountId || template.defaultBankAccountId || undefined,
      recurringExpenseId: template.id,
      isRecurring: true,
    });
  }
}
