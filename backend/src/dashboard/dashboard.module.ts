import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { Property } from '../portfolios/property.entity';
import { Customer } from '../customers/customer.entity';
import { Interaction } from '../customers/interaction.entity';
import { Commission } from '../commissions/commission.entity';
import { User } from '../users/user.entity';
import { Transaction } from '../transactions/transaction.entity';
import { TransactionNote } from '../transactions/transaction-note.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Property, Customer, Interaction, Commission, User, Transaction, TransactionNote])],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
