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
import { CreateAccountingEntryDto } from './dto/create-accounting-entry.dto';

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
