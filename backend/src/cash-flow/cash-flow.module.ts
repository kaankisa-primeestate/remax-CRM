import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChequeNote } from '../cheque-notes/cheque-note.entity';
import { AccountingCommission } from '../accounting/accounting-commission.entity';
import { AccountingRent } from '../accounting/accounting-rent.entity';
import { RecurringExpensesModule } from '../recurring-expenses/recurring-expenses.module';
import { CashFlowService } from './cash-flow.service';
import { CashFlowController } from './cash-flow.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ChequeNote, AccountingCommission, AccountingRent]), RecurringExpensesModule],
  providers: [CashFlowService],
  controllers: [CashFlowController],
})
export class CashFlowModule {}
