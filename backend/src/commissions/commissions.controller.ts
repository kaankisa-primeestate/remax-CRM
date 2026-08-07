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
}
