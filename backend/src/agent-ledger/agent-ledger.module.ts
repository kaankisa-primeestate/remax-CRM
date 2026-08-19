import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Commission } from '../commissions/commission.entity';
import { CommissionPayment } from '../commissions/commission-payment.entity';
import { AgentLedgerAdjustment } from './agent-ledger-adjustment.entity';
import { BankTransaction } from '../bank-accounts/bank-transaction.entity';
import { AgentDue } from '../agent-dues/agent-due.entity';
import { AgentLedgerService } from './agent-ledger.service';
import { AgentLedgerController } from './agent-ledger.controller';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Commission, CommissionPayment, AgentLedgerAdjustment, BankTransaction, AgentDue]),
    UsersModule,
  ],
  providers: [AgentLedgerService],
  controllers: [AgentLedgerController],
})
export class AgentLedgerModule {}
