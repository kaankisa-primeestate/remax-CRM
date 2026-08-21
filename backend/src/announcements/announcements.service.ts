import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Announcement } from './announcement.entity';
import { AnnouncementResponse } from './announcement-response.entity';
import { AnnouncementDismissal } from './announcement-dismissal.entity';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { RespondAnnouncementDto } from './dto/respond-announcement.dto';
import { CurrentUserPayload } from '../auth/current-user.decorator';

@Injectable()
export class AnnouncementsService {
  constructor(
    @InjectRepository(Announcement) private readonly announcementRepo: Repository<Announcement>,
    @InjectRepository(AnnouncementResponse) private readonly responseRepo: Repository<AnnouncementResponse>,
    @InjectRepository(AnnouncementDismissal) private readonly dismissalRepo: Repository<AnnouncementDismissal>,
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

  // Danisman: sadece kendine (veya "tumune") gonderilenleri gorur, ayrica
  // KENDI yanitini (myResponse) da gorur -- boylece "zaten yanitladin"
  // durumunu UI'da gosterebiliriz.
  // Broker: gonderdigi tum duyurulari, HERKESIN yanitiyla birlikte gorur
  // (responseCounts + responses listesi) -- toplanti gibi konularda kim
  // katilacak/katilamayacak diye tek bakista gorebilmesi icin.
  async findAllForUser(currentUser: CurrentUserPayload, includeDismissed = false): Promise<any[]> {
    const all = await this.announcementRepo.find({ order: { createdAt: 'DESC' } });
    const visible =
      currentUser.role === 'broker'
        ? all
        : all.filter(
            (a) => !a.targetAgentIds || a.targetAgentIds.length === 0 || a.targetAgentIds.includes(currentUser.userId),
          );

    if (visible.length === 0) return [];

    const announcementIds = visible.map((a) => a.id);
    const allResponses = await this.responseRepo
      .createQueryBuilder('r')
      .where('r.announcementId IN (:...ids)', { ids: announcementIds })
      .getMany();

    // Danisman icin: kendi okundu/kapatildi durumunu (dismissal) da cek.
    // Broker'in genel gorunumu bundan ETKILENMEZ -- dismissal tamamen
    // kisisel, sadece o danismanin KENDI ekranindan kaybolmasini saglar.
    const myDismissals =
      currentUser.role === 'agent'
        ? await this.dismissalRepo.find({ where: { announcementId: In(announcementIds), agentId: currentUser.userId } })
        : [];
    const dismissalByAnnouncementId = new Map(myDismissals.map((d) => [d.announcementId, d]));

    const filtered = includeDismissed
      ? visible
      : visible.filter((a) => currentUser.role === 'broker' || !dismissalByAnnouncementId.get(a.id)?.dismissedAt);

    return filtered.map((a) => {
      const responsesForThis = allResponses.filter((r) => r.announcementId === a.id);
      if (currentUser.role === 'broker') {
        return {
          ...a,
          responses: responsesForThis.map((r) => ({
            agentId: r.agentId,
            agentName: r.agentName,
            status: r.status,
            note: r.note,
            createdAt: r.createdAt,
          })),
          responseCounts: {
            yes: responsesForThis.filter((r) => r.status === 'yes').length,
            no: responsesForThis.filter((r) => r.status === 'no').length,
          },
        };
      }
      const mine = responsesForThis.find((r) => r.agentId === currentUser.userId);
      const dismissal = dismissalByAnnouncementId.get(a.id);
      return {
        ...a,
        myResponse: mine ? { status: mine.status, note: mine.note } : null,
        isRead: !!dismissal?.readAt,
        isDismissed: !!dismissal?.dismissedAt,
      };
    });
  }

  // Danisman bir duyuruyu ACIP icerigini gordugunde cagrilir -- "okundu"
  // isaretler (kapatma/silme ile KARISTIRILMAMALI, ayri bir durum).
  async markRead(announcementId: string, currentUser: CurrentUserPayload): Promise<void> {
    const announcement = await this.announcementRepo.findOne({ where: { id: announcementId } });
    if (!announcement) {
      throw new NotFoundException('Duyuru bulunamadı');
    }
    let dismissal = await this.dismissalRepo.findOne({
      where: { announcementId, agentId: currentUser.userId },
    });
    if (!dismissal) {
      dismissal = this.dismissalRepo.create({ announcementId, agentId: currentUser.userId });
    }
    if (!dismissal.readAt) {
      dismissal.readAt = new Date();
      await this.dismissalRepo.save(dismissal);
    }
  }

  // Danisman "Sil" dedi -- SADECE kendi ekranindan kaldirilir, Broker'in
  // ve diger danismanlarin gorunumu etkilenmez (bkz. entity aciklamasi).
  async dismiss(announcementId: string, currentUser: CurrentUserPayload): Promise<void> {
    const announcement = await this.announcementRepo.findOne({ where: { id: announcementId } });
    if (!announcement) {
      throw new NotFoundException('Duyuru bulunamadı');
    }
    let dismissal = await this.dismissalRepo.findOne({
      where: { announcementId, agentId: currentUser.userId },
    });
    if (!dismissal) {
      dismissal = this.dismissalRepo.create({ announcementId, agentId: currentUser.userId });
    }
    dismissal.readAt = dismissal.readAt || new Date();
    dismissal.dismissedAt = new Date();
    await this.dismissalRepo.save(dismissal);
  }

  // Danisman kendi yanitini verir/gunceller (upsert).
  async respond(
    announcementId: string,
    dto: RespondAnnouncementDto,
    currentUser: CurrentUserPayload,
  ): Promise<AnnouncementResponse> {
    const announcement = await this.announcementRepo.findOne({ where: { id: announcementId } });
    if (!announcement) {
      throw new NotFoundException('Duyuru bulunamadı');
    }
    let response = await this.responseRepo.findOne({
      where: { announcementId, agentId: currentUser.userId },
    });
    if (response) {
      response.status = dto.status;
      response.note = dto.note ?? null;
    } else {
      response = this.responseRepo.create({
        announcementId,
        agentId: currentUser.userId,
        agentName: currentUser.name,
        status: dto.status,
        note: dto.note ?? null,
      });
    }
    return this.responseRepo.save(response);
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
