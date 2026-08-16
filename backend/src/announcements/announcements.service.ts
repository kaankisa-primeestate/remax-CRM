import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Announcement } from './announcement.entity';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { CurrentUserPayload } from '../auth/current-user.decorator';

@Injectable()
export class AnnouncementsService {
  constructor(
    @InjectRepository(Announcement) private readonly announcementRepo: Repository<Announcement>,
  ) {}

  // Sadece Broker olusturabilir (controller'da @Roles ile de korunuyor,
  // burada ikinci bir savunma katmani).
  async create(dto: CreateAnnouncementDto, currentUser: CurrentUserPayload): Promise<Announcement> {
    const announcement = this.announcementRepo.create({
      ...dto,
      createdBy: currentUser.userId,
      targetAgentIds: dto.targetAgentIds?.length ? dto.targetAgentIds : null,
    });
    return this.announcementRepo.save(announcement);
  }

  // Danisman: sadece kendine (veya "tumune") gonderilenleri gorur.
  // Broker: gonderdigi tum duyurulari gorur (gecmis kaydi icin).
  async findAllForUser(currentUser: CurrentUserPayload): Promise<Announcement[]> {
    const all = await this.announcementRepo.find({ order: { createdAt: 'DESC' } });
    if (currentUser.role === 'broker') {
      return all;
    }
    return all.filter(
      (a) => !a.targetAgentIds || a.targetAgentIds.length === 0 || a.targetAgentIds.includes(currentUser.userId),
    );
  }

  async remove(id: string, currentUser: CurrentUserPayload): Promise<void> {
    const announcement = await this.announcementRepo.findOne({ where: { id } });
    if (!announcement) {
      throw new NotFoundException('Duyuru bulunamadı');
    }
    if (currentUser.role !== 'broker') {
      throw new ForbiddenException('Sadece Broker duyuru silebilir');
    }
    await this.announcementRepo.remove(announcement);
  }
}
