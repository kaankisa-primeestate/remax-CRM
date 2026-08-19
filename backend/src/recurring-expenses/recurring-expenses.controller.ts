import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { RecurringExpensesService } from './recurring-expenses.service';
import { CreateRecurringExpenseDto } from './dto/create-recurring-expense.dto';
import { UpdateRecurringExpenseDto } from './dto/update-recurring-expense.dto';
import { PayRecurringExpenseDto } from './dto/pay-recurring-expense.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user.entity';

// Finans modulu tamamen Broker'a ozel (Expenses controller ile ayni desen).
@Controller('recurring-expenses')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.BROKER)
export class RecurringExpensesController {
  constructor(private readonly service: RecurringExpensesService) {}

  @Post()
  create(@Body() dto: CreateRecurringExpenseDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  // GET /api/recurring-expenses/pending?period=2026-08
  @Get('pending')
  getPending(@Query('period') period: string) {
    return this.service.getPendingForPeriod(period);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateRecurringExpenseDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.service.remove(id);
    return { success: true };
  }

  @Post(':id/pay')
  pay(@Param('id') id: string, @Body() dto: PayRecurringExpenseDto) {
    return this.service.pay(id, dto);
  }
}
