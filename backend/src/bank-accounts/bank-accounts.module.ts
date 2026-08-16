import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BankAccount } from './bank-account.entity';
import { BankTransaction } from './bank-transaction.entity';
import { BankAccountsService } from './bank-accounts.service';
import { BankAccountsController } from './bank-accounts.controller';

@Module({
  imports: [TypeOrmModule.forFeature([BankAccount, BankTransaction])],
  providers: [BankAccountsService],
  controllers: [BankAccountsController],
})
export class BankAccountsModule {}
