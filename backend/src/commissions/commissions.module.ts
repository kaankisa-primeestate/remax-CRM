import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Commission } from './commission.entity';
import { CommissionPayment } from './commission-payment.entity';
import { BankTransaction } from '../bank-accounts/bank-transaction.entity';
import { Transaction } from '../transactions/transaction.entity';
import { UsersModule } from '../users/users.module';
import { CommissionsService } from './commissions.service';
import { CommissionsController } from './commissions.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Commission, CommissionPayment, BankTransaction, Transaction]), UsersModule],
  providers: [CommissionsService],
  controllers: [CommissionsController],
  exports: [CommissionsService],
})
export class CommissionsModule {}
