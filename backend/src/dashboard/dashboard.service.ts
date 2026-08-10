import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { Property } from '../portfolios/property.entity';
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

    return { leaderboard, activity, badges };
  }
}
