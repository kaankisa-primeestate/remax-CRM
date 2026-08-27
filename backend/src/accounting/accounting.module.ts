import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountingAccount } from './accounting-account.entity';
import { AccountingEntry } from './accounting-entry.entity';
import { AccountingCommission } from './accounting-commission.entity';
import { User } from '../users/user.entity';
import { AccountingController } from './accounting.controller';
import { AccountingService } from './accounting.service';

@Module({
  imports: [TypeOrmModule.forFeature([AccountingAccount, AccountingEntry, AccountingCommission, User])],
  controllers: [AccountingController],
  providers: [AccountingService],
  exports: [AccountingService],
})
export class AccountingModule {}
