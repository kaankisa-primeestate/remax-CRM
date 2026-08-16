import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AgentLedgerService } from './agent-ledger.service';
import { CreateAdjustmentDto } from './dto/create-adjustment.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../auth/current-user.decorator';
import { UsersService } from '../users/users.service';

// Mahremiyet Duvari: Danisman sadece kendi cari hesabini gorur (service
// icinde assertAccess ile kontrol edilir); manuel kayit ekleme/silme
// sadece Broker'a acik.
@Controller('agent-ledger')
@UseGuards(JwtAuthGuard)
export class AgentLedgerController {
  constructor(
    private readonly agentLedgerService: AgentLedgerService,
    private readonly usersService: UsersService,
  ) {}

  // GET /api/agent-ledger/balance?agentId=... -- Danisman kendi ID'sini
  // vermese de service zaten kendi bakiyesini dondurur; Broker istedigi
  // danismanin ID'sini verir.
  @Get('balance')
  getBalance(@Query('agentId') agentId: string, @CurrentUser() user: CurrentUserPayload) {
    const targetId = user.role === 'agent' ? user.userId : agentId;
    return this.agentLedgerService.getBalance(targetId, user);
  }

  // GET /api/agent-ledger/summary -- Broker: tum danismanlarin bakiyeleri
  @Get('summary')
  async getSummary(@CurrentUser() user: CurrentUserPayload) {
    if (user.role !== 'broker') {
      return {};
    }
    const agents = await this.usersService.findAllAgents();
    return this.agentLedgerService.getSummaryForAgents(agents.map((a) => a.id));
  }

  @Get('history')
  getHistory(@Query('agentId') agentId: string, @CurrentUser() user: CurrentUserPayload) {
    const targetId = user.role === 'agent' ? user.userId : agentId;
    return this.agentLedgerService.getHistory(targetId, user);
  }

  @Post('adjustments')
  createAdjustment(@Body() dto: CreateAdjustmentDto, @CurrentUser() user: CurrentUserPayload) {
    return this.agentLedgerService.createAdjustment(dto, user);
  }

  @Delete('adjustments/:id')
  async removeAdjustment(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    await this.agentLedgerService.removeAdjustment(id, user);
    return { success: true };
  }
}
