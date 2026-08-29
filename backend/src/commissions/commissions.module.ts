import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Commission } from './commission.entity';
import { CommissionPayment } from './commission-payment.entity';
import { BankTransaction } from '../bank-accounts/bank-transaction.entity';
import { Transaction } from '../transactions/transaction.entity';
import { ChequeNote } from '../cheque-notes/cheque-note.entity';
import { AccountingCommission } from '../accounting/accounting-commission.entity';
import { User } from '../users/user.entity';
import { UsersModule } from '../users/users.module';
import { CommissionsService } from './commissions.service';
import { CommissionsController } from './commissions.controller';
import { AccountingModule } from '../accounting/accounting.module';

@Module({
  imports: [TypeOrmModule.forFeature([Commission, CommissionPayment, BankTransaction, Transaction, ChequeNote, AccountingCommission, User]), UsersModule, AccountingModule],
  providers: [CommissionsService],
  controllers: [CommissionsController],
  exports: [CommissionsService],
})
export class CommissionsModule {}
