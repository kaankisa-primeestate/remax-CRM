import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { ValuationsService } from './valuations.service';
import { CreateValuationDto } from './dto/create-valuation.dto';
import { UpdateValuationDto } from './dto/update-valuation.dto';
import { AddCompDto } from './dto/add-comp.dto';
import { UpdateCompDto } from './dto/update-comp.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../auth/current-user.decorator';

@Controller('valuations')
@UseGuards(JwtAuthGuard)
export class ValuationsController {
  constructor(private readonly valuationsService: ValuationsService) {}

  @Get()
  findAll(@CurrentUser() user: CurrentUserPayload) {
    return this.valuationsService.findAll(user);
  }

  // GET /api/valuations/prefill?propertyId=... -- ":id" rotasindan ONCE
  // tanimlanmali, yoksa "prefill" kelimesi :id parametresi sanilir.
  @Get('prefill')
  prefillFromProperty(@Query('propertyId') propertyId: string, @CurrentUser() user: CurrentUserPayload) {
    return this.valuationsService.prefillFromProperty(propertyId, user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.valuationsService.findOne(id, user);
  }

  @Post()
  create(@Body() dto: CreateValuationDto, @CurrentUser() user: CurrentUserPayload) {
    return this.valuationsService.create(dto, user);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateValuationDto, @CurrentUser() user: CurrentUserPayload) {
    return this.valuationsService.update(id, dto, user);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    await this.valuationsService.remove(id, user);
    return { success: true };
  }

  @Post(':id/comps')
  addComp(@Param('id') id: string, @Body() dto: AddCompDto, @CurrentUser() user: CurrentUserPayload) {
    return this.valuationsService.addComp(id, dto, user);
  }

  @Patch('comps/:compId')
  updateComp(@Param('compId') compId: string, @Body() dto: UpdateCompDto, @CurrentUser() user: CurrentUserPayload) {
    return this.valuationsService.updateComp(compId, dto, user);
  }

  @Delete('comps/:compId')
  removeComp(@Param('compId') compId: string, @CurrentUser() user: CurrentUserPayload) {
    return this.valuationsService.removeComp(compId, user);
  }

  // GET /api/valuations/:id/pdf -- markali PDF raporu indirir
  @Get(':id/pdf')
  async downloadPdf(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload, @Res() res: Response) {
    const buffer = await this.valuationsService.generatePdf(id, user);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="piyasa-analizi-${id}.pdf"`,
      'Content-Length': buffer.length,
    });
    res.send(buffer);
  }
}
