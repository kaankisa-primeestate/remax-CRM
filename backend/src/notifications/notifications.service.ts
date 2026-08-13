import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { Property } from '../portfolios/property.entity';
import { Customer } from '../customers/customer.entity';
import { Interaction } from '../customers/interaction.entity';
import { Commission } from '../commissions/commission.entity';
import { User } from '../users/user.entity';

const PROPERTY_STATUS_LABELS: Record<string, string> = {
  active: 'Aktif',
  passive: 'Pasif',
  sold: 'Satıldı',
  rented: 'Kiralandı',
};

export type NotificationType =
  | 'new_property'
  | 'property_status_changed'
  | 'new_customer'
  | 'interaction'
  | 'commission_added'
  | 'commission_approved';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  agentName: string;
  occurredAt: Date;
  read: boolean;
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
  ) {}

  async getRecentActivity(userId: string): Promise<{ items: NotificationItem[]; unreadCount: number }> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    const seenAt = user?.lastNotificationsSeenAt ?? null;

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
    ]);

    const items: NotificationItem[] = [
      ...newProperties.map((p) => ({
        id: `property-new-${p.id}`,
        type: 'new_property' as const,
        title: `Yeni portföy eklendi: ${p.title}`,
        agentName: nameFor(p.agentId),
        occurredAt: p.createdAt,
        read: false,
      })),
      ...statusChangedProperties.map((p) => ({
        id: `property-status-${p.id}-${new Date(p.statusChangedAt as Date).getTime()}`,
        type: 'property_status_changed' as const,
        title: `Portföy durumu değişti: ${p.title} → ${PROPERTY_STATUS_LABELS[p.status] || p.status}`,
        agentName: nameFor(p.agentId),
        occurredAt: p.statusChangedAt as Date,
        read: false,
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
