import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CommissionsService } from './commissions.service';
import { CreateCommissionDto } from './create-commission.dto';
import { CreateCommissionPaymentDto } from './dto/create-commission-payment.dto';
import { UsersService } from '../users/users.service';

@Controller('commissions')
@UseGuards(AuthGuard('jwt'))
export class CommissionsController {
  constructor(
    private readonly commissionsService: CommissionsService,
    private readonly usersService: UsersService,
  ) {}

  @Post()
  create(@Body() dto: CreateCommissionDto, @Request() req) {
    return this.commissionsService.create(dto, req.user.userId, req.user.role);
  }

  @Get()
  findAll(
    @Request() req,
    @Query('agentId') agentId?: string,
    @Query('status') status?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.commissionsService.findAll(req.user.userId, req.user.role, {
      agentId,
      status,
      fromDate,
      toDate,
    });
  }

  @Get('summary')
  summary(
    @Request() req,
    @Query('agentId') agentId?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.commissionsService.summary(req.user.userId, req.user.role, {
      agentId,
      fromDate,
      toDate,
    });
  }

  // GET /api/commissions/suggest-rate?agentId=X&transactionAmount=Y --
  // Kademeli Prim onerisi. Statik route oldugu icin ':id' route'undan
  // ONCE tanimlanmali (aksi halde 'suggest-rate' bir id gibi yakalanir).
  @Get('suggest-rate')
  async suggestRate(
    @Query('agentId') agentId: string,
    @Query('transactionAmount') transactionAmount: string,
  ) {
    const agent = await this.usersService.findById(agentId);
    return this.commissionsService.suggestRate(
      agentId,
      Number(transactionAmount) || 0,
      agent?.tierCommissionRules || null,
      agent?.commissionSharePercentage != null ? Number(agent.commissionSharePercentage) : null,
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.commissionsService.findOne(id, req.user.userId, req.user.role);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: Partial<CreateCommissionDto> & { status?: string },
    @Request() req,
  ) {
    return this.commissionsService.update(
      id,
      dto,
      req.user.userId,
      req.user.role,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.commissionsService.remove(id, req.user.role);
  }

  // GET /api/commissions/:id/payments -- bir komisyonun kismi odeme gecmisi
  @Get(':id/payments')
  getPayments(@Param('id') id: string) {
    return this.commissionsService.getPayments(id);
  }

  // POST /api/commissions/:id/payments -- Broker kismi odeme ekler
  @Post(':id/payments')
  addPayment(@Param('id') id: string, @Body() dto: CreateCommissionPaymentDto, @Request() req) {
    return this.commissionsService.addPayment(id, dto, req.user.role);
  }

  @Delete('payments/:paymentId')
  removePayment(@Param('paymentId') paymentId: string, @Request() req) {
    return this.commissionsService.removePayment(paymentId, req.user.role);
  }
}
