import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Appointment } from './appointment.entity';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { CurrentUserPayload } from '../auth/current-user.decorator';

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectRepository(Appointment) private readonly appointmentRepo: Repository<Appointment>,
  ) {}

  // Randevular her zaman olusturan danismana aittir -- Mahremiyet Duvari:
  // Broker tum randevulari gorebilir, Danisman sadece kendisininkini.
  async create(dto: CreateAppointmentDto, currentUser: CurrentUserPayload): Promise<Appointment> {
    const appointment = this.appointmentRepo.create({ ...dto, agentId: currentUser.userId });
    return this.appointmentRepo.save(appointment);
  }

  async findAll(currentUser: CurrentUserPayload): Promise<Appointment[]> {
    const where = currentUser.role === 'agent' ? { agentId: currentUser.userId } : {};
    return this.appointmentRepo.find({ where, order: { date: 'ASC', time: 'ASC' } });
  }

  private async findOneOwned(id: string, currentUser: CurrentUserPayload): Promise<Appointment> {
    const appointment = await this.appointmentRepo.findOne({ where: { id } });
    if (!appointment) {
      throw new NotFoundException('Randevu bulunamadı');
    }
    if (currentUser.role === 'agent' && appointment.agentId !== currentUser.userId) {
      throw new ForbiddenException('Bu randevuya erişim yetkiniz yok');
    }
    return appointment;
  }

  async update(id: string, dto: UpdateAppointmentDto, currentUser: CurrentUserPayload): Promise<Appointment> {
    const appointment = await this.findOneOwned(id, currentUser);
    Object.assign(appointment, dto);
    return this.appointmentRepo.save(appointment);
  }

  async remove(id: string, currentUser: CurrentUserPayload): Promise<void> {
    const appointment = await this.findOneOwned(id, currentUser);
    await this.appointmentRepo.remove(appointment);
  }
}
