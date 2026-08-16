import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AgentDuesService } from './agent-dues.service';
import { GenerateDuesDto } from './dto/generate-dues.dto';
import { MarkPaidDto } from './dto/mark-paid.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../auth/current-user.decorator';

// Mahremiyet Duvari: Danisman sadece kendi aidatlarini gorur (service
// icinde filtrelenir); olusturma/odeme isaretleme sadece Broker'a acik.
@Controller('agent-dues')
@UseGuards(JwtAuthGuard)
export class AgentDuesController {
  constructor(private readonly agentDuesService: AgentDuesService) {}

  // POST /api/agent-dues/generate -- Broker, bir ay icin toplu aidat kaydi acar
  @Post('generate')
  generate(@Body() dto: GenerateDuesDto, @CurrentUser() user: CurrentUserPayload) {
    return this.agentDuesService.generateForMonth(dto, user);
  }

  @Get()
  findAll(@CurrentUser() user: CurrentUserPayload) {
    return this.agentDuesService.findAll(user);
  }

  @Patch(':id/paid')
  markPaid(@Param('id') id: string, @Body() dto: MarkPaidDto, @CurrentUser() user: CurrentUserPayload) {
    return this.agentDuesService.markPaid(id, dto, user);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    await this.agentDuesService.remove(id, user);
    return { success: true };
  }
}
