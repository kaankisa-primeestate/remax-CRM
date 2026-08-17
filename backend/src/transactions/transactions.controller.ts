import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { AddNoteDto } from './dto/add-note.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../auth/current-user.decorator';

// Mahremiyet Duvari: her endpoint giris yapmayi zorunlu kilar; filtreleme
// mantigi TransactionsService icinde, giris yapan kullanicinin rolune gore uygulanir.
@Controller('transactions')
@UseGuards(JwtAuthGuard)
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  // POST /api/transactions
  @Post()
  create(@Body() dto: CreateTransactionDto, @CurrentUser() user: CurrentUserPayload) {
    return this.transactionsService.create(dto, user);
  }

  // GET /api/transactions -- Danisman sadece kendi islemlerini, Broker tumunu gorur
  @Get()
  findAll(@CurrentUser() user: CurrentUserPayload) {
    return this.transactionsService.findAll(user);
  }

  // PATCH /api/transactions/:id
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTransactionDto, @CurrentUser() user: CurrentUserPayload) {
    return this.transactionsService.update(id, dto, user);
  }

  // DELETE /api/transactions/:id
  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    await this.transactionsService.remove(id, user);
    return { success: true };
  }

  // GET /api/transactions/:id/notes -- Zaman Akisi sekmesi
  @Get(':id/notes')
  getNotes(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.transactionsService.getNotes(id, user);
  }

  // POST /api/transactions/:id/notes
  @Post(':id/notes')
  addNote(@Param('id') id: string, @Body() dto: AddNoteDto, @CurrentUser() user: CurrentUserPayload) {
    return this.transactionsService.addNote(id, dto, user);
  }
}
