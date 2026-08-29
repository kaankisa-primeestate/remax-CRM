import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountingAccount } from './accounting-account.entity';
import { AccountingEntry } from './accounting-entry.entity';
import { AccountingCommission } from './accounting-commission.entity';
import { AccountingRent } from './accounting-rent.entity';
import { AccountingParty } from './accounting-party.entity';
import { AccountingRecurringExpense } from './accounting-recurring-expense.entity';
import { AccountingCategory } from './accounting-category.entity';
import { AccountingAuditLog } from './accounting-audit-log.entity';
import { AccountingResetLog } from './accounting-reset-log.entity';
import { AccountingQuickExpensePreference } from './accounting-quick-expense-preference.entity';
import { User } from '../users/user.entity';
import { BankAccount } from '../bank-accounts/bank-account.entity';
import { BankTransaction } from '../bank-accounts/bank-transaction.entity';
import { Expense } from '../expenses/expense.entity';
import { ExpenseCategoryDefinition } from '../expenses/expense-category-definition.entity';
import { RecurringExpense } from '../recurring-expenses/recurring-expense.entity';
import { Commission } from '../commissions/commission.entity';
import { CommissionPayment } from '../commissions/commission-payment.entity';
import { AgentDue } from '../agent-dues/agent-due.entity';
import { Partner } from '../partners/partner.entity';
import { PartnerLedgerEntry } from '../partners/partner-ledger-entry.entity';
import { AgentLedgerAdjustment } from '../agent-ledger/agent-ledger-adjustment.entity';
import { ChequeNote } from '../cheque-notes/cheque-note.entity';
import { AccountingController } from './accounting.controller';
import { AccountingService } from './accounting.service';
import { AccountingMigrationService } from './accounting-migration.service';
import { AccountingAgentReadService } from './accounting-agent-read.service';

@Module({
  imports: [TypeOrmModule.forFeature([
    AccountingAccount,
    AccountingEntry,
    AccountingCommission,
    AccountingRent,
    AccountingParty,
    AccountingRecurringExpense,
    AccountingCategory,
    AccountingAuditLog,
    AccountingResetLog,
    AccountingQuickExpensePreference,
    User,
    BankAccount,
    BankTransaction,
    Expense,
    ExpenseCategoryDefinition,
    RecurringExpense,
    Commission,
    CommissionPayment,
    AgentDue,
    Partner,
    PartnerLedgerEntry,
    AgentLedgerAdjustment,
    ChequeNote,
  ])],
  controllers: [AccountingController],
  providers: [AccountingService, AccountingMigrationService, AccountingAgentReadService],
  exports: [AccountingService, AccountingAgentReadService],
})
export class AccountingModule {}
