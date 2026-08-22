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
import { AddDocumentDto } from './dto/add-document.dto';
import { UpdateSplitDto } from './dto/update-split.dto';
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

  // GET /api/transactions/:id -- Islem Dosyasi (detay sayfasi) icin tek kayit
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.transactionsService.findOne(id, user);
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

  // GET /api/transactions/broker-flags/unresolved -- Broker Aksiyon Merkezi icin
  @Get('broker-flags/unresolved')
  getUnresolvedBrokerFlags() {
    return this.transactionsService.getUnresolvedBrokerFlags();
  }

  // PATCH /api/transactions/notes/:noteId/resolve -- SADECE Broker
  @Patch('notes/:noteId/resolve')
  resolveNoteFlag(@Param('noteId') noteId: string, @CurrentUser() user: CurrentUserPayload) {
    return this.transactionsService.resolveNoteFlag(noteId, user);
  }

  // GET /api/transactions/:id/documents -- Belgeler sekmesi
  @Get(':id/documents')
  getDocuments(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.transactionsService.getDocuments(id, user);
  }

  // POST /api/transactions/:id/documents
  @Post(':id/documents')
  addDocument(@Param('id') id: string, @Body() dto: AddDocumentDto, @CurrentUser() user: CurrentUserPayload) {
    return this.transactionsService.addDocument(id, dto, user);
  }

  // PATCH /api/transactions/documents/:documentId -- Danisman kucuk
  // duzeltmeler yapabilir (silme haric, bkz. asagisi)
  @Patch('documents/:documentId')
  updateDocument(@Param('documentId') documentId: string, @Body() dto: AddDocumentDto, @CurrentUser() user: CurrentUserPayload) {
    return this.transactionsService.updateDocument(documentId, dto, user);
  }

  // DELETE /api/transactions/documents/:documentId -- SADECE Broker
  @Delete('documents/:documentId')
  async removeDocument(@Param('documentId') documentId: string, @CurrentUser() user: CurrentUserPayload) {
    await this.transactionsService.removeDocument(documentId, user);
    return { success: true };
  }

  // --- Isbirlikli Satis ---

  // PATCH /api/transactions/:id/split -- paylasim oranini degistir
  // (degisiklik her iki onayı da sifirlar, taraflar tekrar onaylamali)
  @Patch(':id/split')
  updateSplit(
    @Param('id') id: string,
    @Body() dto: UpdateSplitDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.transactionsService.updateSplit(id, dto, user);
  }

  // POST /api/transactions/:id/split/approve -- cagiran kullanici KENDI
  // tarafini onaylar, iki taraf da onaylayinca paylasim kesinlesir
  @Post(':id/split/approve')
  approveSplit(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.transactionsService.approveSplit(id, user);
  }
}
