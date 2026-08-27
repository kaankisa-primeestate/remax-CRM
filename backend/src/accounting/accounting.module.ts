import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountingAccount } from './accounting-account.entity';
import { AccountingEntry } from './accounting-entry.entity';
import { AccountingCommission } from './accounting-commission.entity';
import { AccountingRent } from './accounting-rent.entity';
import { AccountingParty } from './accounting-party.entity';
import { User } from '../users/user.entity';
import { AccountingController } from './accounting.controller';
import { AccountingService } from './accounting.service';

@Module({
  imports: [TypeOrmModule.forFeature([AccountingAccount, AccountingEntry, AccountingCommission, AccountingRent, AccountingParty, User])],
  controllers: [AccountingController],
  providers: [AccountingService],
  exports: [AccountingService],
})
export class AccountingModule {}
