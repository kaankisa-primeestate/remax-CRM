import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Announcement } from './announcement.entity';
import { AnnouncementResponse } from './announcement-response.entity';
import { AnnouncementDismissal } from './announcement-dismissal.entity';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { RespondAnnouncementDto } from './dto/respond-announcement.dto';
import { CurrentUserPayload } from '../auth/current-user.decorator';
import { User, UserRole } from '../users/user.entity';

@Injectable()
export class AnnouncementsService {
  constructor(
    @InjectRepository(Announcement) private readonly announcementRepo: Repository<Announcement>,
    @InjectRepository(AnnouncementResponse) private readonly responseRepo: Repository<AnnouncementResponse>,
    @InjectRepository(AnnouncementDismissal) private readonly dismissalRepo: Repository<AnnouncementDismissal>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
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
  //
  // NOT: find+create+save yerine ATOMIK bir upsert kullaniyoruz -- iki
  // istek (orn. modal acilirken tetiklenen "okundu" + kullanicinin hemen
  // ardindan bastigi "Sil") AYNI ANDA gelirse, eski find+create+save
  // deseni bir "unique constraint" cakismasina (2. istek satiri zaten
  // var saniyor, INSERT deniyor) yol aciyordu -- bu YARIS DURUMU
  // (race condition) canlida "Duyuru kaldirilamadi" hatasina sebep oldu.
  // upsert, veritabani seviyesinde INSERT...ON CONFLICT DO UPDATE
  // calistirir, bu tur bir cakismayi yapisal olarak imkansiz kilar.
  async markRead(announcementId: string, currentUser: CurrentUserPayload): Promise<void> {
    const announcement = await this.announcementRepo.findOne({ where: { id: announcementId } });
    if (!announcement) {
      throw new NotFoundException('Duyuru bulunamadı');
    }
    // Sadece readAt gonderiliyor -- upsert cakisma aninda SADECE bu
    // sutunu gunceller, mevcut dismissedAt'e (varsa) dokunmaz.
    await this.dismissalRepo.upsert(
      { announcementId, agentId: currentUser.userId, readAt: new Date() },
      ['announcementId', 'agentId'],
    );
  }

  // Danisman "Sil" dedi -- SADECE kendi ekranindan kaldirilir, Broker'in
  // ve diger danismanlarin gorunumu etkilenmez (bkz. entity aciklamasi).
  async dismiss(announcementId: string, currentUser: CurrentUserPayload): Promise<void> {
    const announcement = await this.announcementRepo.findOne({ where: { id: announcementId } });
    if (!announcement) {
      throw new NotFoundException('Duyuru bulunamadı');
    }
    const now = new Date();
    await this.dismissalRepo.upsert(
      { announcementId, agentId: currentUser.userId, readAt: now, dismissedAt: now },
      ['announcementId', 'agentId'],
    );
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

  // --- Broker Raporu: "Kim Okudu / Kapattı?" ---
  // Hedef kitledeki (targetAgentIds doluysa onlar, bosta TUM danismanlar)
  // her danisman icin okundu/kapatildi zaman damgasini dondurur. Hic
  // etkilesime girmemis danismanlar da listede gorunur (readAt/dismissedAt
  // null olarak) -- "hala gormedi" bilgisini de acikca gostermek icin.
  async getReadStatus(
    announcementId: string,
    currentUser: CurrentUserPayload,
  ): Promise<{ agentId: string; agentName: string; readAt: Date | null; dismissedAt: Date | null }[]> {
    if (currentUser.role !== 'broker') {
      throw new ForbiddenException('Sadece Broker görüntüleyebilir');
    }
    const announcement = await this.announcementRepo.findOne({ where: { id: announcementId } });
    if (!announcement) {
      throw new NotFoundException('Duyuru bulunamadı');
    }

    const targetAgents =
      announcement.targetAgentIds && announcement.targetAgentIds.length > 0
        ? await this.userRepo.find({ where: { id: In(announcement.targetAgentIds) } })
        : await this.userRepo.find({ where: { role: UserRole.AGENT } });

    if (targetAgents.length === 0) return [];

    const dismissals = await this.dismissalRepo.find({
      where: { announcementId, agentId: In(targetAgents.map((a) => a.id)) },
    });
    const dismissalByAgentId = new Map(dismissals.map((d) => [d.agentId, d]));

    return targetAgents
      .map((agent) => {
        const d = dismissalByAgentId.get(agent.id);
        return {
          agentId: agent.id,
          agentName: agent.name,
          readAt: d?.readAt ?? null,
          dismissedAt: d?.dismissedAt ?? null,
        };
      })
      .sort((a, b) => a.agentName.localeCompare(b.agentName, 'tr'));
  }
}
