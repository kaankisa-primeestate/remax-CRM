import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BankAccount } from '../bank-accounts/bank-account.entity';
import { BankTransaction, BankTransactionType } from '../bank-accounts/bank-transaction.entity';
import { Expense } from '../expenses/expense.entity';
import { ExpenseCategoryDefinition } from '../expenses/expense-category-definition.entity';
import { RecurringExpense } from '../recurring-expenses/recurring-expense.entity';
import { Commission } from '../commissions/commission.entity';
import { CommissionPayment } from '../commissions/commission-payment.entity';
import { AgentDue } from '../agent-dues/agent-due.entity';
import { Partner } from '../partners/partner.entity';
import { PartnerLedgerEntry, PartnerLedgerType } from '../partners/partner-ledger-entry.entity';
import { AgentLedgerAdjustment, LedgerAdjustmentType } from '../agent-ledger/agent-ledger-adjustment.entity';
import { ChequeNote } from '../cheque-notes/cheque-note.entity';

const CURRENCIES = ['TRY', 'EUR', 'USD'];

type CurrencyTotal = {
  income: number;
  expense: number;
  transactionCount: number;
};

@Injectable()
export class AccountingMigrationService {
  constructor(
    @InjectRepository(BankAccount) private readonly bankAccountRepo: Repository<BankAccount>,
    @InjectRepository(BankTransaction) private readonly bankTransactionRepo: Repository<BankTransaction>,
    @InjectRepository(Expense) private readonly expenseRepo: Repository<Expense>,
    @InjectRepository(ExpenseCategoryDefinition) private readonly expenseCategoryRepo: Repository<ExpenseCategoryDefinition>,
    @InjectRepository(RecurringExpense) private readonly recurringExpenseRepo: Repository<RecurringExpense>,
    @InjectRepository(Commission) private readonly commissionRepo: Repository<Commission>,
    @InjectRepository(CommissionPayment) private readonly commissionPaymentRepo: Repository<CommissionPayment>,
    @InjectRepository(AgentDue) private readonly agentDueRepo: Repository<AgentDue>,
    @InjectRepository(Partner) private readonly partnerRepo: Repository<Partner>,
    @InjectRepository(PartnerLedgerEntry) private readonly partnerLedgerRepo: Repository<PartnerLedgerEntry>,
    @InjectRepository(AgentLedgerAdjustment) private readonly agentAdjustmentRepo: Repository<AgentLedgerAdjustment>,
    @InjectRepository(ChequeNote) private readonly chequeNoteRepo: Repository<ChequeNote>,
  ) {}

  async preview() {
    const [
      bankAccounts,
      bankTransactions,
      expenses,
      expenseCategories,
      recurringExpenses,
      commissions,
      commissionPayments,
      agentDues,
      partners,
      partnerLedgerEntries,
      agentAdjustments,
      chequeNotes,
    ] = await Promise.all([
      this.bankAccountRepo.find(),
      this.bankTransactionRepo.find(),
      this.expenseRepo.find(),
      this.expenseCategoryRepo.find(),
      this.recurringExpenseRepo.find(),
      this.commissionRepo.find(),
      this.commissionPaymentRepo.find(),
      this.agentDueRepo.find(),
      this.partnerRepo.find(),
      this.partnerLedgerRepo.find(),
      this.agentAdjustmentRepo.find(),
      this.chequeNoteRepo.find(),
    ]);

    const accountCurrency = new Map(bankAccounts.map((account) => [account.id, account.currency || 'TRY']));
    const totalsByCurrency: Record<string, CurrencyTotal> = Object.fromEntries(
      CURRENCIES.map((currency) => [currency, { income: 0, expense: 0, transactionCount: 0 }]),
    );
    let transactionsWithoutAccount = 0;

    for (const transaction of bankTransactions) {
      const currency = accountCurrency.get(transaction.bankAccountId) || 'TRY';
      const total = totalsByCurrency[currency] || (totalsByCurrency[currency] = { income: 0, expense: 0, transactionCount: 0 });
      total.transactionCount += 1;
      if (transaction.type === BankTransactionType.DEPOSIT) total.income += Number(transaction.amount || 0);
      if (transaction.type === BankTransactionType.WITHDRAWAL) total.expense += Number(transaction.amount || 0);
      if (!accountCurrency.has(transaction.bankAccountId)) transactionsWithoutAccount += 1;
    }

    const sum = (values: number[]) => Number(values.reduce((total, value) => total + Number(value || 0), 0).toFixed(2));
    const categoryIds = new Set(expenseCategories.map((category) => category.id));
    const orphanedExpenseCategories = expenses.filter((expense) => expense.categoryId && !categoryIds.has(expense.categoryId)).length;
    const expensesWithoutBankAccount = expenses.filter((expense) => !expense.bankAccountId).length;
    const duesPaid = agentDues.filter((due) => due.paid).length;
    const commissionStatusCounts = commissions.reduce<Record<string, number>>((counts, commission) => {
      counts[commission.status] = (counts[commission.status] || 0) + 1;
      return counts;
    }, {});
    const partnerCredit = sum(partnerLedgerEntries.filter((entry) => entry.type === PartnerLedgerType.CREDIT).map((entry) => entry.amount));
    const partnerDebit = sum(partnerLedgerEntries.filter((entry) => entry.type === PartnerLedgerType.DEBIT).map((entry) => entry.amount));
    const agentCredit = sum(agentAdjustments.filter((entry) => entry.type === LedgerAdjustmentType.CREDIT).map((entry) => entry.amount));
    const agentDebit = sum(agentAdjustments.filter((entry) => entry.type === LedgerAdjustmentType.DEBIT).map((entry) => entry.amount));

    return {
      readOnly: true,
      generatedAt: new Date().toISOString(),
      source: 'Eski Finans',
      target: 'Yeni Muhasebe',
      sourceCounts: {
        bankAccounts: bankAccounts.length,
        bankTransactions: bankTransactions.length,
        expenses: expenses.length,
        expenseCategories: expenseCategories.length,
        recurringExpenseTemplates: recurringExpenses.length,
        commissions: commissions.length,
        commissionPayments: commissionPayments.length,
        agentDues: agentDues.length,
        partners: partners.length,
        partnerLedgerEntries: partnerLedgerEntries.length,
        agentLedgerAdjustments: agentAdjustments.length,
        chequeNotes: chequeNotes.length,
      },
      totalsByCurrency,
      detailTotals: {
        expenseAmount: sum(expenses.map((expense) => expense.amount)),
        commissionGrossAmount: sum(commissions.map((commission) => commission.grossCommission)),
        commissionAgentShare: sum(commissions.map((commission) => commission.agentGrossShare)),
        commissionPaymentAmount: sum(commissionPayments.map((payment) => payment.amount)),
        agentDueAmount: sum(agentDues.map((due) => due.expectedAmount)),
        partnerCredit,
        partnerDebit,
        agentCredit,
        agentDebit,
        chequeNoteAmount: sum(chequeNotes.map((note) => note.amount)),
      },
      qualityChecks: {
        transactionsWithoutAccount,
        expensesWithoutBankAccount,
        orphanedExpenseCategories,
        duesPaid,
        duesUnpaid: agentDues.length - duesPaid,
        commissionStatusCounts,
      },
      mapping: {
        bankAccounts: 'Muhasebe hesapları',
        bankTransactions: 'Hesap hareketleri',
        expenses: 'Gider hareketleri ve varsa danışman yansıtma cari hareketleri',
        commissions: 'Komisyon tahakkuku + ayrı tahsilat ve danışman ödeme hareketleri',
        agentDues: 'Danışman kira tahakkuku + varsa tahsilat hareketi',
        partners: 'Ortak cari kartları ve ortak hareketleri',
        recurringExpenseTemplates: 'Tekrarlayan gider şablonları',
        chequeNotes: 'İlk Muhasebe sürümünde ayrı arşiv/inceleme gerektirir; sessizce kayda dönüştürülmez',
      },
      warnings: [
        ...(transactionsWithoutAccount > 0 ? [`${transactionsWithoutAccount} eski banka hareketi bir hesaba bağlanamıyor.`] : []),
        ...(expensesWithoutBankAccount > 0 ? [`${expensesWithoutBankAccount} eski giderin ödeme hesabı bulunmuyor; bunlar nakit bakiyeye otomatik yazılmamalı.`] : []),
        ...(orphanedExpenseCategories > 0 ? [`${orphanedExpenseCategories} eski giderin kategori bağlantısı doğrulanamadı.`] : []),
        ...(chequeNotes.length > 0 ? [`${chequeNotes.length} çek/senet kaydı var; yeni Muhasebe ilk sürümünde çek/senet takibi bulunmadığı için ayrıca korunmalı.`] : []),
        ...(partnerLedgerEntries.some((entry) => !entry.bankAccountId) ? ['Banka hesabına bağlı olmayan ortak hareketleri nakit değil, yalnız cari borç/alacak olarak aktarılmalı.'] : []),
      ],
    };
  }
}
