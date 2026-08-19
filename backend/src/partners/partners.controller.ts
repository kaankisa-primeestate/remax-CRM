import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { PartnersService } from './partners.service';
import { CreatePartnerDto } from './dto/create-partner.dto';
import { UpdatePartnerDto } from './dto/update-partner.dto';
import { CreatePartnerAdjustmentDto } from './dto/create-partner-adjustment.dto';
import { DistributeProfitDto } from './dto/distribute-profit.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user.entity';

@Controller('partners')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.BROKER)
export class PartnersController {
  constructor(private readonly service: PartnersService) {}

  @Post()
  create(@Body() dto: CreatePartnerDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get('summary')
  getSummary() {
    return this.service.getSummary();
  }

  @Get(':id/history')
  getHistory(@Param('id') id: string) {
    return this.service.getHistory(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePartnerDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.service.remove(id);
    return { success: true };
  }

  @Post(':id/adjustments')
  addAdjustment(@Param('id') id: string, @Body() dto: CreatePartnerAdjustmentDto) {
    return this.service.addAdjustment(id, dto);
  }

  @Delete('adjustments/:entryId')
  async removeAdjustment(@Param('entryId') entryId: string) {
    await this.service.removeAdjustment(entryId);
    return { success: true };
  }

  @Post('distribute-profit')
  distributeProfit(@Body() dto: DistributeProfitDto) {
    return this.service.distributeProfit(dto);
  }
}
