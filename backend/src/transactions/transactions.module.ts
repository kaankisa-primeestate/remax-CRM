import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transaction } from './transaction.entity';
import { TransactionNote } from './transaction-note.entity';
import { TransactionDocument } from './transaction-document.entity';
import { Property } from '../portfolios/property.entity';
import { Customer } from '../customers/customer.entity';
import { AccountingCommission } from '../accounting/accounting-commission.entity';
import { TransactionsService } from './transactions.service';
import { TransactionsController } from './transactions.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Transaction, TransactionNote, TransactionDocument, Property, Customer, AccountingCommission])],
  providers: [TransactionsService],
  controllers: [TransactionsController],
})
export class TransactionsModule {}
