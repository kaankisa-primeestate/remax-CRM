import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Expense } from './expense.entity';
import { BankTransaction } from '../bank-accounts/bank-transaction.entity';
import { BankAccount } from '../bank-accounts/bank-account.entity';
import { AgentLedgerAdjustment } from '../agent-ledger/agent-ledger-adjustment.entity';
import { ExpensesService } from './expenses.service';
import { ExpensesController } from './expenses.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Expense, BankTransaction, AgentLedgerAdjustment, BankAccount])],
  providers: [ExpensesService],
  controllers: [ExpensesController],
  exports: [ExpensesService],
})
export class ExpensesModule {}
