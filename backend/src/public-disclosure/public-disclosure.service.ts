import { BadRequestException, GoneException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Appointment } from '../appointments/appointment.entity';
import { Customer } from '../customers/customer.entity';
import { Property } from '../portfolios/property.entity';
import { User } from '../users/user.entity';

@Injectable()
export class PublicDisclosureService {
  constructor(
    @InjectRepository(Appointment) private readonly appointmentRepo: Repository<Appointment>,
    @InjectRepository(Customer) private readonly customerRepo: Repository<Customer>,
    @InjectRepository(Property) private readonly propertyRepo: Repository<Property>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  // Musterinin telefonundan actigi sayfanin gosterecegi veri -- SADECE
  // gosterim icin gereken alanlar donuyor, TC/telefon gibi hassas bilgi
  // asla bu public endpoint'ten sizmiyor.
  async getForSigning(token: string) {
    const appointment = await this.appointmentRepo.findOne({ where: { disclosureToken: token } });
    if (!appointment) {
      throw new NotFoundException('Bu link geçersiz veya süresi dolmuş');
    }
    if (appointment.disclosureAccepted) {
      throw new GoneException('Bu belge zaten imzalanmış');
    }

    const [customer, property, agent] = await Promise.all([
      appointment.customerId ? this.customerRepo.findOne({ where: { id: appointment.customerId } }) : null,
      appointment.propertyId ? this.propertyRepo.findOne({ where: { id: appointment.propertyId } }) : null,
      this.userRepo.findOne({ where: { id: appointment.agentId } }),
    ]);

    return {
      customerName: customer ? `${customer.firstName} ${customer.lastName}` : appointment.title,
      propertyTitle: property?.title || null,
      agentName: agent?.name || null,
      date: appointment.date,
      time: appointment.time,
    };
  }

  // Musterinin cizdigi/yazdigi imzayi kaydeder -- tek kullanimliktir,
  // ayni token ile IKINCI KEZ imzalamaya izin verilmez.
  async sign(
    token: string,
    dto: { signatureImage?: string; signedName?: string; method: 'draw' | 'type' },
    ip: string,
  ) {
    const appointment = await this.appointmentRepo.findOne({ where: { disclosureToken: token } });
    if (!appointment) {
      throw new NotFoundException('Bu link geçersiz veya süresi dolmuş');
    }
    if (appointment.disclosureAccepted) {
      throw new GoneException('Bu belge zaten imzalanmış');
    }
    if (dto.method === 'draw' && !dto.signatureImage) {
      throw new BadRequestException('İmza çizilmedi');
    }
    if (dto.method === 'type' && !dto.signedName?.trim()) {
      throw new BadRequestException('İsim girilmedi');
    }

    appointment.disclosureAccepted = true;
    appointment.disclosureAcceptedAt = new Date();
    appointment.disclosureSignatureImage = dto.method === 'draw' ? dto.signatureImage! : null;
    appointment.disclosureSignedName = dto.method === 'type' ? dto.signedName!.trim() : null;
    appointment.disclosureSignatureMethod = dto.method;
    appointment.disclosureSignedIp = ip;

    await this.appointmentRepo.save(appointment);
    return { success: true };
  }
}
