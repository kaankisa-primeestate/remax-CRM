import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Partner } from './partner.entity';
import { PartnerLedgerEntry } from './partner-ledger-entry.entity';
import { BankTransaction } from '../bank-accounts/bank-transaction.entity';
import { PartnersService } from './partners.service';
import { PartnersController } from './partners.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Partner, PartnerLedgerEntry, BankTransaction])],
  providers: [PartnersService],
  controllers: [PartnersController],
})
export class PartnersModule {}
