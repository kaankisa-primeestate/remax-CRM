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
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../auth/current-user.decorator';

// Mahremiyet Duvari: her endpoint giris yapmayi zorunlu kilar; filtreleme
// mantigi AppointmentsService icinde, giris yapan kullanicinin rolune gore uygulanir.
@Controller('appointments')
@UseGuards(JwtAuthGuard)
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  // POST /api/appointments
  @Post()
  create(@Body() dto: CreateAppointmentDto, @CurrentUser() user: CurrentUserPayload) {
    return this.appointmentsService.create(dto, user);
  }

  // GET /api/appointments -- Danisman sadece kendi randevularini, Broker tumunu gorur
  @Get()
  findAll(@CurrentUser() user: CurrentUserPayload) {
    return this.appointmentsService.findAll(user);
  }

  // PATCH /api/appointments/:id
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAppointmentDto, @CurrentUser() user: CurrentUserPayload) {
    return this.appointmentsService.update(id, dto, user);
  }

  // DELETE /api/appointments/:id
  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    await this.appointmentsService.remove(id, user);
    return { success: true };
  }
}
