import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { Property, PropertyStatus } from '../portfolios/property.entity';
import { Customer } from '../customers/customer.entity';
import { Interaction } from '../customers/interaction.entity';
import { Commission } from '../commissions/commission.entity';
import { User, UserRole } from '../users/user.entity';
import { PropertyComment } from '../property-comments/property-comment.entity';
import { Appointment } from '../appointments/appointment.entity';
import { Announcement } from '../announcements/announcement.entity';
import { Transaction } from '../transactions/transaction.entity';

const PROPERTY_STATUS_LABELS: Record<string, string> = {
  active: 'Aktif',
  passive: 'Pasif',
  sold: 'Satıldı',
  rented: 'Kiralandı',
  pending_approval: 'Onay Bekliyor',
  needs_revision: 'Revizyon Gerekli',
};

export type NotificationType =
  | 'new_property'
  | 'property_status_changed'
  | 'new_customer'
  | 'interaction'
  | 'commission_added'
  | 'commission_approved'
  | 'property_pending_approval'
  | 'broker_message'
  | 'showing_disclosure'
  | 'announcement'
  | 'deal_pending_approval';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  agentName: string;
  occurredAt: Date;
  read: boolean;
  propertyId?: string;
}

// Her kaynaktan en fazla bu kadar kayit cekilir (performans icin)
const LIMIT_PER_SOURCE = 100;
// Zile toplamda gosterilecek maksimum bildirim sayisi
const TOTAL_LIMIT = 100;

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Property) private readonly propertyRepo: Repository<Property>,
    @InjectRepository(Customer) private readonly customerRepo: Repository<Customer>,
    @InjectRepository(Interaction) private readonly interactionRepo: Repository<Interaction>,
    @InjectRepository(Commission) private readonly commissionRepo: Repository<Commission>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(PropertyComment) private readonly commentRepo: Repository<PropertyComment>,
    @InjectRepository(Appointment) private readonly appointmentRepo: Repository<Appointment>,
    @InjectRepository(Announcement) private readonly announcementRepo: Repository<Announcement>,
    @InjectRepository(Transaction) private readonly transactionRepo: Repository<Transaction>,
  ) {}

  async getRecentActivity(userId: string): Promise<{ items: NotificationItem[]; unreadCount: number }> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    const seenAt = user?.lastNotificationsSeenAt ?? null;

    // Danisman ve Broker'in zili TAMAMEN FARKLI icerikler gosterir --
    // Danisman kendi ilanlarina gelen Broker mesajlarini gorur, Broker
    // ise genel ofis aktivitesi + onay bekleyen ilanlari gorur.
    if (user?.role === UserRole.AGENT) {
      return this.getAgentNotifications(userId, seenAt);
    }
    return this.getBrokerNotifications(seenAt);
  }

  private async getBrokerNotifications(
    seenAt: Date | null,
  ): Promise<{ items: NotificationItem[]; unreadCount: number }> {
    const allUsers = await this.userRepo.find();
    const nameById = new Map(allUsers.map((u) => [u.id, u.name]));
    const nameFor = (agentId: string | null): string => {
      if (!agentId) return 'Atanmamış';
      return nameById.get(agentId) || 'Bilinmeyen';
    };

    const [
      newProperties,
      statusChangedProperties,
      newCustomers,
      interactions,
      newCommissions,
      approvedCommissions,
      pendingApprovalProperties,
      acceptedDisclosures,
      pendingDeals,
    ] = await Promise.all([
      this.propertyRepo.find({ order: { createdAt: 'DESC' }, take: LIMIT_PER_SOURCE }),
      this.propertyRepo.find({
        where: { statusChangedAt: Not(IsNull()) },
        order: { statusChangedAt: 'DESC' },
        take: LIMIT_PER_SOURCE,
      }),
      this.customerRepo.find({ order: { createdAt: 'DESC' }, take: LIMIT_PER_SOURCE }),
      this.interactionRepo.find({
        order: { createdAt: 'DESC' },
        take: LIMIT_PER_SOURCE,
        relations: ['customer'],
      }),
      this.commissionRepo.find({ order: { createdAt: 'DESC' }, take: LIMIT_PER_SOURCE }),
      this.commissionRepo.find({
        where: { status: 'approved' as any, statusChangedAt: Not(IsNull()) },
        order: { statusChangedAt: 'DESC' },
        take: LIMIT_PER_SOURCE,
      }),
      // Onay bekleyen (veya revizyon sonrasi tekrar gonderilen) ilanlar --
      // Broker'in "acil onaylanmasi gereken" ilanlardan haberdar olmasi icin.
      this.propertyRepo.find({
        where: { status: PropertyStatus.PENDING_APPROVAL },
        order: { statusChangedAt: 'DESC', createdAt: 'DESC' },
        take: LIMIT_PER_SOURCE,
      }),
      // Yer Gosterme beyani onaylanan randevular -- hukuki kayit, Broker'in
      // haberdar olmasi ve gerektiginde kontrol edebilmesi icin.
      this.appointmentRepo.find({
        where: { disclosureAcceptedAt: Not(IsNull()) },
        order: { disclosureAcceptedAt: 'DESC' },
        take: LIMIT_PER_SOURCE,
      }),
      // Tapu asamasina gelmis ama Broker henuz onaylamamis islemler --
      // onaylandiginda otomatik komisyon kaydi acilacak.
      this.transactionRepo.find({
        where: { stage: 'deed' as any, dealApproved: false },
        order: { stageChangedAt: 'DESC', createdAt: 'DESC' },
        take: LIMIT_PER_SOURCE,
      }),
    ]);

    const items: NotificationItem[] = [
      ...newProperties.map((p) => ({
        id: `property-new-${p.id}`,
        type: 'new_property' as const,
        title: `Yeni portföy eklendi: ${p.title}`,
        agentName: nameFor(p.agentId),
        occurredAt: p.createdAt,
        read: false,
        propertyId: p.id,
      })),
      ...statusChangedProperties.map((p) => ({
        id: `property-status-${p.id}-${new Date(p.statusChangedAt as Date).getTime()}`,
        type: 'property_status_changed' as const,
        title: `Portföy durumu değişti: ${p.title} → ${PROPERTY_STATUS_LABELS[p.status] || p.status}`,
        agentName: nameFor(p.agentId),
        occurredAt: p.statusChangedAt as Date,
        read: false,
        propertyId: p.id,
      })),
      ...newCustomers.map((c) => ({
        id: `customer-new-${c.id}`,
        type: 'new_customer' as const,
        title: `Yeni müşteri eklendi: ${c.firstName} ${c.lastName}`,
        agentName: nameFor(c.agentId),
        occurredAt: c.createdAt,
        read: false,
      })),
      ...interactions.map((i) => ({
        id: `interaction-${i.id}`,
        type: 'interaction' as const,
        title: `Görüşme kaydı eklendi: ${(i.notes || '').slice(0, 60)}`,
        agentName: nameFor(i.customer?.agentId ?? null),
        occurredAt: i.createdAt,
        read: false,
      })),
      ...newCommissions.map((cm) => ({
        id: `commission-new-${cm.id}`,
        type: 'commission_added' as const,
        title: `Komisyon eklendi: ${cm.propertyTitle || cm.transactionType}`,
        agentName: nameFor(cm.agentId),
        occurredAt: cm.createdAt,
        read: false,
      })),
      ...approvedCommissions.map((cm) => ({
        id: `commission-approved-${cm.id}-${new Date(cm.statusChangedAt as Date).getTime()}`,
        type: 'commission_approved' as const,
        title: `Komisyon onaylandı: ${cm.propertyTitle || cm.transactionType}`,
        agentName: nameFor(cm.agentId),
        occurredAt: cm.statusChangedAt as Date,
        read: false,
      })),
      ...pendingApprovalProperties.map((p) => ({
        id: `property-pending-${p.id}-${new Date(p.statusChangedAt || p.createdAt).getTime()}`,
        type: 'property_pending_approval' as const,
        title: `Onay bekleyen ilan: ${p.title}`,
        agentName: nameFor(p.agentId),
        occurredAt: (p.statusChangedAt as Date) || p.createdAt,
        read: false,
        propertyId: p.id,
      })),
      ...acceptedDisclosures.map((a) => ({
        id: `disclosure-${a.id}-${new Date(a.disclosureAcceptedAt as Date).getTime()}`,
        type: 'showing_disclosure' as const,
        title: `Yer gösterme beyanı alındı: ${a.title}`,
        agentName: nameFor(a.agentId),
        occurredAt: a.disclosureAcceptedAt as Date,
        read: false,
        propertyId: a.propertyId || undefined,
      })),
      ...pendingDeals.map((t) => ({
        id: `deal-pending-${t.id}-${new Date(t.stageChangedAt || t.createdAt).getTime()}`,
        type: 'deal_pending_approval' as const,
        title: `Tapu onayı bekleyen işlem`,
        agentName: nameFor(t.agentId),
        occurredAt: (t.stageChangedAt as Date) || t.createdAt,
        read: false,
        propertyId: t.propertyId,
      })),
    ]
      .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
      .slice(0, TOTAL_LIMIT)
      .map((item) => ({
        ...item,
        read: seenAt ? new Date(item.occurredAt).getTime() <= new Date(seenAt).getTime() : false,
      }));

    const unreadCount = items.filter((i) => !i.read).length;

    return { items, unreadCount };
  }

  // Danismanin zili: kendi portfoylerine gelen Broker mesajlarini gosterir
  // (bkz. PropertyComments -- "Revize Iste" de dahil olmak uzere HER
  // Broker mesaji burada bir bildirim olarak cikar).
  private async getAgentNotifications(
    agentId: string,
    seenAt: Date | null,
  ): Promise<{ items: NotificationItem[]; unreadCount: number }> {
    const ownProperties = await this.propertyRepo.find({ where: { agentId } });
    const propertyIds = ownProperties.length ? ownProperties.map((p) => p.id) : ['00000000-0000-0000-0000-000000000000'];
    const titleById = new Map(ownProperties.map((p) => [p.id, p.title]));

    const brokerComments = propertyIds.length
      ? await this.commentRepo
          .createQueryBuilder('comment')
          .where('comment.propertyId IN (:...propertyIds)', { propertyIds })
          .andWhere('comment.authorRole = :role', { role: 'broker' })
          .orderBy('comment.createdAt', 'DESC')
          .take(LIMIT_PER_SOURCE)
          .getMany()
      : [];

    // Broker'dan gelen duyurular (tumune ya da sadece bu danismana
    // gonderilenler) -- basit olcekte tum kayitlari cekip JS'te filtreliyoruz,
    // cunku simple-array kolonlarda Postgres "contains" sorgusu TypeORM'de
    // dogrudan desteklenmiyor.
    const allAnnouncements = await this.announcementRepo.find({ order: { createdAt: 'DESC' }, take: LIMIT_PER_SOURCE });
    const myAnnouncements = allAnnouncements.filter(
      (a) => !a.targetAgentIds || a.targetAgentIds.length === 0 || a.targetAgentIds.includes(agentId),
    );

    const items: NotificationItem[] = [
      ...brokerComments.map((c) => ({
        id: `broker-message-${c.id}`,
        type: 'broker_message' as const,
        title: `Broker mesaj gönderdi: ${titleById.get(c.propertyId) || 'Portföy'}`,
        agentName: c.authorName,
        occurredAt: c.createdAt,
        read: false,
        propertyId: c.propertyId,
      })),
      ...myAnnouncements.map((a) => ({
        id: `announcement-${a.id}`,
        type: 'announcement' as const,
        title: `Duyuru: ${a.title}`,
        agentName: 'Broker',
        occurredAt: a.createdAt,
        read: false,
      })),
    ]
      .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
      .slice(0, TOTAL_LIMIT)
      .map((item) => ({
        ...item,
        read: seenAt ? new Date(item.occurredAt).getTime() <= new Date(seenAt).getTime() : false,
      }));

    const unreadCount = items.filter((i) => !i.read).length;

    return { items, unreadCount };
  }

  async markSeen(userId: string): Promise<void> {
    await this.userRepo.update(userId, { lastNotificationsSeenAt: new Date() });
  }
}
