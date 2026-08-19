import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChequeNote } from '../cheque-notes/cheque-note.entity';
import { Commission } from '../commissions/commission.entity';
import { AgentDue } from '../agent-dues/agent-due.entity';
import { RecurringExpensesModule } from '../recurring-expenses/recurring-expenses.module';
import { CashFlowService } from './cash-flow.service';
import { CashFlowController } from './cash-flow.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ChequeNote, Commission, AgentDue]), RecurringExpensesModule],
  providers: [CashFlowService],
  controllers: [CashFlowController],
})
export class CashFlowModule {}
