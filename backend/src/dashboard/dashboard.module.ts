import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { Property } from '../portfolios/property.entity';
import { Customer } from '../customers/customer.entity';
import { Interaction } from '../customers/interaction.entity';
import { AccountingCommission } from '../accounting/accounting-commission.entity';
import { AccountingRent } from '../accounting/accounting-rent.entity';
import { User } from '../users/user.entity';
import { Transaction } from '../transactions/transaction.entity';
import { TransactionNote } from '../transactions/transaction-note.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Property, Customer, Interaction, AccountingCommission, User, Transaction, TransactionNote, AccountingRent])],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
