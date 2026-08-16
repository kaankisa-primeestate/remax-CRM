import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { BankAccountsService } from './bank-accounts.service';
import { CreateBankAccountDto } from './dto/create-bank-account.dto';
import { CreateBankTransactionDto } from './dto/create-bank-transaction.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user.entity';

// Finans modulu tamamen Broker'a ozel -- Danisman erisimi yok (mevcut
// sidebar yapisinda zaten Finans sadece Broker menusunde).
@Controller('bank-accounts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.BROKER)
export class BankAccountsController {
  constructor(private readonly bankAccountsService: BankAccountsService) {}

  @Post()
  create(@Body() dto: CreateBankAccountDto) {
    return this.bankAccountsService.create(dto);
  }

  @Get()
  findAll(@Query('includeInactive') includeInactive?: string) {
    return this.bankAccountsService.findAll(includeInactive === 'true');
  }

  @Patch(':id/active')
  setActive(@Param('id') id: string, @Body('isActive') isActive: boolean) {
    return this.bankAccountsService.setActive(id, isActive);
  }

  @Get(':id/transactions')
  findTransactions(@Param('id') id: string) {
    return this.bankAccountsService.findTransactions(id);
  }

  @Post(':id/transactions')
  addTransaction(@Param('id') id: string, @Body() dto: CreateBankTransactionDto) {
    return this.bankAccountsService.addTransaction(id, dto);
  }

  @Delete('transactions/:transactionId')
  async removeTransaction(@Param('transactionId') transactionId: string) {
    await this.bankAccountsService.removeTransaction(transactionId);
    return { success: true };
  }
}
