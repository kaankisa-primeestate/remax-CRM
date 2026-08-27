import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user.entity';
import { AccountingEntryType } from './accounting-entry.entity';
import { AccountingService } from './accounting.service';
import { CreateAccountingAccountDto } from './dto/create-accounting-account.dto';
import {
  CreateAccountingCommissionDto,
  SettleAccountingCommissionDto,
} from './dto/create-accounting-commission.dto';
import {
  GenerateAccountingRentsDto,
  SettleAccountingRentDto,
} from './dto/accounting-rent.dto';
import { CreateAccountingEntryDto } from './dto/create-accounting-entry.dto';
import { CreateAccountingPartyDto } from './dto/create-accounting-party.dto';
import { CreateAccountingCategoryDto } from './dto/create-accounting-category.dto';
import {
  CreateAccountingRecurringExpenseDto,
  GenerateAccountingRecurringExpenseDto,
} from './dto/accounting-recurring-expense.dto';

@Controller('accounting')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.BROKER)
export class AccountingController {
  constructor(private readonly accountingService: AccountingService) {}

  @Get('accounts')
  listAccounts() {
    return this.accountingService.listAccounts();
  }

  @Post('accounts')
  createAccount(@Body() dto: CreateAccountingAccountDto) {
    return this.accountingService.createAccount(dto);
  }

  @Get('entries')
  listEntries(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('currency') currency?: string,
    @Query('type') type?: AccountingEntryType,
  ) {
    return this.accountingService.listEntries({ from, to, currency, type });
  }

  @Post('entries')
  createEntry(@Body() dto: CreateAccountingEntryDto, @Req() req: any) {
    return this.accountingService.createEntry(dto, req.user.userId);
  }

  @Get('summary')
  getSummary(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('currency') currency?: string,
  ) {
    return this.accountingService.getSummary({ from, to, currency });
  }

  @Get('rents')
  listRents(
    @Query('period') period?: string,
    @Query('currency') currency?: string,
  ) {
    return this.accountingService.listRents({ period, currency });
  }

  @Post('rents/generate')
  generateRents(@Body() dto: GenerateAccountingRentsDto, @Req() req: any) {
    return this.accountingService.generateRents(dto, req.user.userId);
  }

  @Post('rents/:id/collect')
  collectRent(
    @Param('id') id: string,
    @Body() dto: SettleAccountingRentDto,
    @Req() req: any,
  ) {
    return this.accountingService.collectRent(id, dto, req.user.userId);
  }

  @Post('rents/:id/void')
  voidRent(@Param('id') id: string, @Req() req: any) {
    return this.accountingService.voidRent(id, req.user.userId);
  }

  @Get('parties')
  listParties(@Query('currency') currency?: string) {
    return this.accountingService.listParties({ currency });
  }

  @Post('parties')
  createParty(@Body() dto: CreateAccountingPartyDto) {
    return this.accountingService.createParty(dto);
  }

  @Get('parties/:id/entries')
  listPartyEntries(@Param('id') id: string) {
    return this.accountingService.listPartyEntries(id);
  }

  @Get('categories')
  listCategories(@Query('type') type?: AccountingEntryType) {
    return this.accountingService.listCategories({ type });
  }

  @Post('categories')
  createCategory(@Body() dto: CreateAccountingCategoryDto) {
    return this.accountingService.createCategory(dto);
  }

  @Get('recurring-expenses')
  listRecurringExpenses(@Query('currency') currency?: string) {
    return this.accountingService.listRecurringExpenses({ currency });
  }

  @Post('recurring-expenses')
  createRecurringExpense(@Body() dto: CreateAccountingRecurringExpenseDto, @Req() req: any) {
    return this.accountingService.createRecurringExpense(dto, req.user.userId);
  }

  @Post('recurring-expenses/generate')
  generateRecurringExpenses(@Body() dto: GenerateAccountingRecurringExpenseDto, @Req() req: any) {
    return this.accountingService.generateRecurringExpenses(dto, req.user.userId);
  }

  @Get('commissions')
  listCommissions() {
    return this.accountingService.listCommissions();
  }

  @Post('commissions')
  createCommission(@Body() dto: CreateAccountingCommissionDto, @Req() req: any) {
    return this.accountingService.createCommission(dto, req.user.userId);
  }

  @Post('commissions/:id/collect')
  collectCommission(
    @Param('id') id: string,
    @Body() dto: SettleAccountingCommissionDto,
    @Req() req: any,
  ) {
    return this.accountingService.collectCommission(id, dto, req.user.userId);
  }

  @Post('commissions/:id/void')
  voidCommission(@Param('id') id: string, @Req() req: any) {
    return this.accountingService.voidCommission(id, req.user.userId);
  }

  @Post('commissions/:id/pay')
  payCommission(
    @Param('id') id: string,
    @Body() dto: SettleAccountingCommissionDto,
    @Req() req: any,
  ) {
    return this.accountingService.payCommission(id, dto, req.user.userId);
  }
}
