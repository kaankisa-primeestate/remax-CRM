import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgentDue } from './agent-due.entity';
import { User } from '../users/user.entity';
import { BankTransaction } from '../bank-accounts/bank-transaction.entity';
import { AgentDuesService } from './agent-dues.service';
import { AgentDuesCronService } from './agent-dues-cron.service';
import { AgentDuesController } from './agent-dues.controller';
import { AccountingModule } from '../accounting/accounting.module';

@Module({
  imports: [TypeOrmModule.forFeature([AgentDue, User, BankTransaction]), AccountingModule],
  providers: [AgentDuesService, AgentDuesCronService],
  controllers: [AgentDuesController],
})
export class AgentDuesModule {}
