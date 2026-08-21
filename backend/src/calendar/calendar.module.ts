import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Appointment } from '../appointments/appointment.entity';
import { Task } from '../tasks/task.entity';
import { Transaction } from '../transactions/transaction.entity';
import { Commission } from '../commissions/commission.entity';
import { AgentDue } from '../agent-dues/agent-due.entity';
import { Property } from '../portfolios/property.entity';
import { Customer } from '../customers/customer.entity';
import { CalendarService } from './calendar.service';
import { CalendarController } from './calendar.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Appointment, Task, Transaction, Commission, AgentDue, Property, Customer])],
  providers: [CalendarService],
  controllers: [CalendarController],
})
export class CalendarModule {}
