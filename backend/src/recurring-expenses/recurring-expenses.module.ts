import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RecurringExpense } from './recurring-expense.entity';
import { Expense } from '../expenses/expense.entity';
import { ExpensesModule } from '../expenses/expenses.module';
import { RecurringExpensesService } from './recurring-expenses.service';
import { RecurringExpensesController } from './recurring-expenses.controller';

@Module({
  imports: [TypeOrmModule.forFeature([RecurringExpense, Expense]), ExpensesModule],
  providers: [RecurringExpensesService],
  controllers: [RecurringExpensesController],
  exports: [RecurringExpensesService],
})
export class RecurringExpensesModule {}
