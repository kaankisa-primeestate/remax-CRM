import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ChequeNotesService } from './cheque-notes.service';
import { CreateChequeNoteDto } from './dto/create-cheque-note.dto';
import { UpdateChequeNoteDto } from './dto/update-cheque-note.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user.entity';

// Finans modulu tamamen Broker'a ozel.
@Controller('cheque-notes')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.BROKER)
export class ChequeNotesController {
  constructor(private readonly service: ChequeNotesService) {}

  @Post()
  create(@Body() dto: CreateChequeNoteDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateChequeNoteDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.service.remove(id);
    return { success: true };
  }
}
