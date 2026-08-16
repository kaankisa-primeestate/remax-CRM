import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgentDue } from './agent-due.entity';
import { User } from '../users/user.entity';
import { BankTransaction } from '../bank-accounts/bank-transaction.entity';
import { AgentDuesService } from './agent-dues.service';
import { AgentDuesController } from './agent-dues.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AgentDue, User, BankTransaction])],
  providers: [AgentDuesService],
  controllers: [AgentDuesController],
})
export class AgentDuesModule {}
