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

@Controller('commissions')
@UseGuards(AuthGuard('jwt'))
export class CommissionsController {
  constructor(private readonly commissionsService: CommissionsService) {}

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
