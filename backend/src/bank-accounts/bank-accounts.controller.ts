import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { BankAccountsService } from './bank-accounts.service';
import { CreateBankAccountDto } from './dto/create-bank-account.dto';
import { UpdateBankAccountDto } from './dto/update-bank-account.dto';
import { CreateTransactionDto } from './dto/create-transaction.dto';

@Controller('bank-accounts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('broker')
export class BankAccountsController {
  constructor(private readonly bankAccountsService: BankAccountsService) {}

  @Get()
  findAll() {
    return this.bankAccountsService.findAll();
  }

  @Get('finance-summary')
  getFinanceSummary(@Query('from') from: string, @Query('to') to: string) {
    const startDate = from ? new Date(from) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const endDate = to ? new Date(to) : new Date();
    return this.bankAccountsService.getFinanceSummary(startDate, endDate);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.bankAccountsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateBankAccountDto) {
    return this.bankAccountsService.create(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateBankAccountDto) {
    return this.bankAccountsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.bankAccountsService.remove(id);
  }

  @Post('transaction')
  addTransaction(@Body() dto: CreateTransactionDto) {
    return this.bankAccountsService.addTransaction(dto);
  }

  @Get(':id/history')
  getHistory(@Param('id') id: string) {
    return this.bankAccountsService.getHistory(id);
  }
}
