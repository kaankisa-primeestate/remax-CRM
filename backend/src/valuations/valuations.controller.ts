import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../auth/current-user.decorator';
import { ValuationsService } from './valuations.service';
import { CreateValuationDto } from './dto/create-valuation.dto';
import { UpdateValuationDto } from './dto/update-valuation.dto';
import { AddCompDto } from './dto/add-comp.dto';
import { UpdateCompDto } from './dto/update-comp.dto';

@Controller('valuations')
@UseGuards(JwtAuthGuard)
export class ValuationsController {
  constructor(private readonly valuationsService: ValuationsService) {}

  @Post()
  create(@Body() dto: CreateValuationDto, @CurrentUser() user: CurrentUserPayload) {
    return this.valuationsService.create(dto, user);
  }

  @Get()
  findAll(@CurrentUser() user: CurrentUserPayload) {
    return this.valuationsService.findAll(user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.valuationsService.findOne(id, user);
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

  // POST /api/valuations/:id/rematch -- subject bilgisi degistiyse otomatik
  // karsilastirmalari yeniden ara (elle eklenenlere dokunmaz)
  @Post(':id/rematch')
  rematch(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.valuationsService.rematch(id, user);
  }

  @Post(':id/comps')
  addComp(@Param('id') id: string, @Body() dto: AddCompDto, @CurrentUser() user: CurrentUserPayload) {
    return this.valuationsService.addComp(id, dto, user);
  }

  @Patch('comps/:compId')
  updateComp(
    @Param('compId') compId: string,
    @Body() dto: UpdateCompDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.valuationsService.updateComp(compId, dto, user);
  }

  @Delete('comps/:compId')
  async removeComp(@Param('compId') compId: string, @CurrentUser() user: CurrentUserPayload) {
    await this.valuationsService.removeComp(compId, user);
    return { success: true };
  }

  // GET /api/valuations/:id/pdf -- markali PDF raporu indirir
  @Get(':id/pdf')
  async downloadPdf(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Res() res: Response,
  ) {
    const buffer = await this.valuationsService.generatePdf(id, user);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="piyasa-analizi-${id}.pdf"`,
      'Content-Length': buffer.length,
    });
    res.send(buffer);
  }
}
