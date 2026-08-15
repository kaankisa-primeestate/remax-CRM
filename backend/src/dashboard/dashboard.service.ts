import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, IsNull, MoreThanOrEqual, Not, Repository } from 'typeorm';
import { Property, PropertyStatus } from '../portfolios/property.entity';
import { Customer } from '../customers/customer.entity';
import { Interaction } from '../customers/interaction.entity';
import { Commission } from '../commissions/commission.entity';
import { User, UserRole } from '../users/user.entity';

interface AgentStats {
  propertiesCount: number;
  customersCount: number;
  interactionsCount: number;
  commissionsCount: number;
  salesValue: number;
}

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Property) private readonly propertyRepo: Repository<Property>,
    @InjectRepository(Customer) private readonly customerRepo: Repository<Customer>,
    @InjectRepository(Interaction) private readonly interactionRepo: Repository<Interaction>,
    @InjectRepository(Commission) private readonly commissionRepo: Repository<Commission>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  async getSummary(from: Date, to: Date) {
    const agents = await this.userRepo.find({ where: { role: UserRole.AGENT } });
    const agentNameById = new Map(agents.map((a) => [a.id, a.name]));

    const [properties, customers, interactions, commissions] = await Promise.all([
      this.propertyRepo.find({ where: { createdAt: Between(from, to) } }),
      this.customerRepo.find({ where: { createdAt: Between(from, to) } }),
      this.interactionRepo.find({ where: { createdAt: Between(from, to) }, relations: ['customer'] }),
      this.commissionRepo.find({ where: { createdAt: Between(from, to) } }),
    ]);

    const statsByAgent = new Map<string, AgentStats>();
    const ensure = (agentId: string): AgentStats => {
      if (!statsByAgent.has(agentId)) {
        statsByAgent.set(agentId, {
          propertiesCount: 0,
          customersCount: 0,
          interactionsCount: 0,
          commissionsCount: 0,
          salesValue: 0,
        });
      }
      return statsByAgent.get(agentId)!;
    };
    const nameFor = (agentId: string | null): string => {
      if (!agentId) return 'Atanmamış';
      return agentNameById.get(agentId) || 'Bilinmeyen';
    };

    for (const p of properties) {
      if (p.agentId) ensure(p.agentId).propertiesCount += 1;
    }
    for (const c of customers) {
      if (c.agentId) ensure(c.agentId).customersCount += 1;
    }
    for (const i of interactions) {
      const agentId = i.customer?.agentId;
      if (agentId) ensure(agentId).interactionsCount += 1;
    }
    for (const cm of commissions) {
      ensure(cm.agentId).commissionsCount += 1;
      ensure(cm.agentId).salesValue += Number(cm.netPayable);
    }

    const leaderboard = Array.from(statsByAgent.entries())
      .map(([agentId, stats]) => ({
        agentId,
        agentName: agentNameById.get(agentId) || 'Bilinmeyen',
        ...stats,
      }))
      .sort((a, b) => b.salesValue - a.salesValue || b.propertiesCount - a.propertiesCount);

    const activity = [
      ...properties.map((p) => ({
        type: 'property' as const,
        agentName: nameFor(p.agentId),
        title: `Yeni portföy: ${p.title}`,
        occurredAt: p.createdAt,
      })),
      ...customers.map((c) => ({
        type: 'customer' as const,
        agentName: nameFor(c.agentId),
        title: `Yeni müşteri: ${c.firstName} ${c.lastName}`,
        occurredAt: c.createdAt,
      })),
      ...interactions.map((i) => ({
        type: 'interaction' as const,
        agentName: nameFor(i.customer?.agentId ?? null),
        title: `Görüşme kaydı: ${(i.notes || '').slice(0, 60)}`,
        occurredAt: i.createdAt,
      })),
      ...commissions.map((cm) => ({
        type: 'commission' as const,
        agentName: nameFor(cm.agentId),
        title: `Komisyon kaydı: ${cm.propertyTitle || cm.transactionType}`,
        occurredAt: cm.createdAt,
      })),
    ]
      .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
      .slice(0, 50);

    const badges: { agentName: string; label: string; icon: string }[] = [];
    if (leaderboard.length) {
      const byProperties = [...leaderboard].sort((a, b) => b.propertiesCount - a.propertiesCount)[0];
      const bySales = [...leaderboard].sort((a, b) => b.salesValue - a.salesValue)[0];
      const byCustomers = [...leaderboard].sort((a, b) => b.customersCount - a.customersCount)[0];
      const byInteractions = [...leaderboard].sort((a, b) => b.interactionsCount - a.interactionsCount)[0];

      if (byProperties.propertiesCount > 0) {
        badges.push({ agentName: byProperties.agentName, label: 'En Çok Portföy', icon: '🏠' });
      }
      if (bySales.salesValue > 0) {
        badges.push({ agentName: bySales.agentName, label: 'En Çok Satış', icon: '💰' });
      }
      if (byCustomers.customersCount > 0) {
        badges.push({ agentName: byCustomers.agentName, label: 'En Çok Müşteri', icon: '👥' });
      }
      if (byInteractions.interactionsCount > 0) {
        badges.push({ agentName: byInteractions.agentName, label: 'En Aktif İletişim', icon: '📞' });
      }
    }

    return {
      leaderboard,
      activity,
      badges,
      expiringContracts: await this.getExpiringContracts(),
      revenueTrend: await this.getRevenueTrend(),
      pendingApprovals: await this.getPendingApprovals(),
    };
  }

  // Danismanin kendi "Bu Ayki Hedefim" karti icin: hedef vs bu ayin
  // gerceklesen ciro tutari (komisyon kayitlarindan).
  async getAgentMonthlyProgress(agentId: string) {
    const agent = await this.userRepo.findOne({ where: { id: agentId } });
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const commissions = await this.commissionRepo.find({
      where: { agentId, createdAt: Between(monthStart, monthEnd) },
    });
    const currentMonthSales = commissions.reduce((sum, c) => sum + Number(c.netPayable), 0);
    const monthlyTarget = agent?.monthlyTarget != null ? Number(agent.monthlyTarget) : null;
    const percentage = monthlyTarget && monthlyTarget > 0
      ? Math.min(100, Math.round((currentMonthSales / monthlyTarget) * 100))
      : null;

    return { monthlyTarget, currentMonthSales, percentage };
  }

  // Onumuzdeki 30 gun icinde sozlesme/vekaletname suresi dolacak
  // portfoyleri dondurur -- Broker Dashboard'daki "Akilli Aksiyon &
  // Onay Merkezi" panelinde kullanilir. Donem (period) secimden
  // bagimsizdir, her zaman "bugunden itibaren 30 gun" ile calisir.
  private async getExpiringContracts() {
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const in30Days = new Date(today);
    in30Days.setDate(in30Days.getDate() + 30);
    const in30DaysStr = in30Days.toISOString().slice(0, 10);

    const agents = await this.userRepo.find();
    const agentNameById = new Map(agents.map((a) => [a.id, a.name]));

    const properties = await this.propertyRepo.find({
      where: {
        contractEndDate: Not(IsNull()) as any,
      },
    });

    return properties
      .filter((p) => p.contractEndDate && p.contractEndDate >= todayStr && p.contractEndDate <= in30DaysStr)
      .map((p) => {
        const daysLeft = Math.ceil(
          (new Date(p.contractEndDate as string).getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
        );
        return {
          propertyId: p.id,
          title: p.title,
          contractEndDate: p.contractEndDate,
          daysLeft,
          agentName: p.agentId ? agentNameById.get(p.agentId) || 'Bilinmeyen' : 'Atanmamış',
        };
      })
      .sort((a, b) => a.daysLeft - b.daysLeft);
  }

  // Son 6 ayin (bu ay dahil) aylik ciro toplamini dondurur -- Broker
  // Dashboard'daki "Ofis Ciro ve Hedef Grafigi" panelinde kullanilir.
  // Donem (period) secimden bagimsizdir, her zaman sabit son 6 ay ile calisir.
  private async getRevenueTrend() {
    const now = new Date();
    const monthsAgo6 = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const commissions = await this.commissionRepo.find({
      where: { createdAt: MoreThanOrEqual(monthsAgo6) },
    });

    const months: { key: string; label: string; total: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('tr-TR', { month: 'short' });
      months.push({ key, label, total: 0 });
    }
    const monthByKey = new Map(months.map((m) => [m.key, m]));

    for (const c of commissions) {
      const d = new Date(c.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const bucket = monthByKey.get(key);
      if (bucket) {
        bucket.total += Number(c.netPayable);
      }
    }

    return months;
  }

  // Onay bekleyen (veya revizyon gerektiren) tum ilanlari dondurur --
  // Broker Dashboard'daki "Akilli Aksiyon & Onay Merkezi" panelinde
  // kullanilir. Donem (period) secimden bagimsizdir.
  private async getPendingApprovals() {
    const agents = await this.userRepo.find();
    const agentNameById = new Map(agents.map((a) => [a.id, a.name]));

    const properties = await this.propertyRepo.find({
      where: [
        { status: PropertyStatus.PENDING_APPROVAL },
        { status: PropertyStatus.NEEDS_REVISION },
      ],
      order: { statusChangedAt: 'ASC', createdAt: 'ASC' },
    });

    return properties.map((p) => ({
      propertyId: p.id,
      title: p.title,
      status: p.status,
      agentName: p.agentId ? agentNameById.get(p.agentId) || 'Bilinmeyen' : 'Atanmamış',
      revisionNote: p.revisionNote,
      createdAt: p.createdAt,
    }));
  }
}
