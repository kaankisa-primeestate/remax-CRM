import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
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
import { AccountingMigrationService } from './accounting-migration.service';
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
import { CorrectAccountingEntryDto } from './dto/correct-accounting-entry.dto';
import { VoidAccountingRecordDto } from './dto/void-accounting-record.dto';
import { ResetAccountingDemoDto } from './dto/reset-accounting-demo.dto';
import {
  UpdateAccountingAccountDto,
  UpdateAccountingPartyDto,
  UpdateAccountingRecurringExpenseDto,
} from './dto/update-accounting-records.dto';
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
  constructor(
    private readonly accountingService: AccountingService,
    private readonly migrationService: AccountingMigrationService,
  ) {}

  @Get('migration/preview')
  getMigrationPreview() {
    return this.migrationService.preview();
  }

  @Get('reset/preview')
  getResetPreview() {
    return this.accountingService.getResetPreview();
  }

  @Post('reset/demo')
  resetDemo(@Body() dto: ResetAccountingDemoDto, @Req() req: any) {
    return this.accountingService.resetDemoData(dto.confirmation, dto.reason, req.user.userId);
  }

  @Get('audit-logs')
  listAuditLogs(
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
  ) {
    return this.accountingService.listAuditLogs({ entityType, entityId });
  }

  @Get('accounts')
  listAccounts() {
    return this.accountingService.listAccounts();
  }

  @Post('accounts')
  createAccount(@Body() dto: CreateAccountingAccountDto, @Req() req: any) {
    return this.accountingService.createAccount(dto, req.user.userId);
  }

  @Patch('accounts/:id')
  updateAccount(@Param('id') id: string, @Body() dto: UpdateAccountingAccountDto, @Req() req: any) {
    return this.accountingService.updateAccount(id, dto, req.user.userId);
  }

  @Post('accounts/:id/archive')
  archiveAccount(@Param('id') id: string, @Body() dto: VoidAccountingRecordDto, @Req() req: any) {
    return this.accountingService.archiveAccount(id, dto.reason, req.user.userId);
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

  @Post('entries/:id/void')
  voidEntry(@Param('id') id: string, @Body() dto: VoidAccountingRecordDto, @Req() req: any) {
    return this.accountingService.voidEntry(id, req.user.userId, dto.reason);
  }

  @Post('entries/:id/correct')
  correctEntry(
    @Param('id') id: string,
    @Body() dto: CorrectAccountingEntryDto,
    @Req() req: any,
  ) {
    return this.accountingService.correctEntry(id, dto, req.user.userId);
  }

  @Get('reports/management')
  getManagementReport(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('currency') currency?: string,
  ) {
    return this.accountingService.getManagementReport({ from, to, currency });
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
  voidRent(@Param('id') id: string, @Body() dto: VoidAccountingRecordDto, @Req() req: any) {
    return this.accountingService.voidRent(id, req.user.userId, dto.reason);
  }

  @Get('parties')
  listParties(@Query('currency') currency?: string) {
    return this.accountingService.listParties({ currency });
  }

  @Post('parties')
  createParty(@Body() dto: CreateAccountingPartyDto, @Req() req: any) {
    return this.accountingService.createParty(dto, req.user.userId);
  }

  @Patch('parties/:id')
  updateParty(@Param('id') id: string, @Body() dto: UpdateAccountingPartyDto, @Req() req: any) {
    return this.accountingService.updateParty(id, dto, req.user.userId);
  }

  @Post('parties/:id/archive')
  archiveParty(@Param('id') id: string, @Body() dto: VoidAccountingRecordDto, @Req() req: any) {
    return this.accountingService.archiveParty(id, dto.reason, req.user.userId);
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
  createCategory(@Body() dto: CreateAccountingCategoryDto, @Req() req: any) {
    return this.accountingService.createCategory(dto, req.user.userId);
  }

  @Post('categories/:id/archive')
  archiveCategory(@Param('id') id: string, @Body() dto: VoidAccountingRecordDto, @Req() req: any) {
    return this.accountingService.archiveCategory(id, dto.reason, req.user.userId);
  }

  @Get('recurring-expenses')
  listRecurringExpenses(@Query('currency') currency?: string) {
    return this.accountingService.listRecurringExpenses({ currency });
  }

  @Post('recurring-expenses')
  createRecurringExpense(@Body() dto: CreateAccountingRecurringExpenseDto, @Req() req: any) {
    return this.accountingService.createRecurringExpense(dto, req.user.userId);
  }

  @Patch('recurring-expenses/:id')
  updateRecurringExpense(@Param('id') id: string, @Body() dto: UpdateAccountingRecurringExpenseDto, @Req() req: any) {
    return this.accountingService.updateRecurringExpense(id, dto, req.user.userId);
  }

  @Post('recurring-expenses/:id/archive')
  archiveRecurringExpense(@Param('id') id: string, @Body() dto: VoidAccountingRecordDto, @Req() req: any) {
    return this.accountingService.archiveRecurringExpense(id, dto.reason, req.user.userId);
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
  voidCommission(@Param('id') id: string, @Body() dto: VoidAccountingRecordDto, @Req() req: any) {
    return this.accountingService.voidCommission(id, req.user.userId, dto.reason);
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
