import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Appointment } from '../appointments/appointment.entity';
import { Task } from '../tasks/task.entity';
import { Transaction } from '../transactions/transaction.entity';
import { AccountingCommission } from '../accounting/accounting-commission.entity';
import { AccountingRent } from '../accounting/accounting-rent.entity';
import { Property } from '../portfolios/property.entity';
import { Customer } from '../customers/customer.entity';
import { CalendarService } from './calendar.service';
import { CalendarController } from './calendar.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Appointment, Task, Transaction, AccountingCommission, AccountingRent, Property, Customer])],
  providers: [CalendarService],
  controllers: [CalendarController],
})
export class CalendarModule {}
