import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, IsNull, MoreThanOrEqual, Not, Repository } from 'typeorm';
import { Property, PropertyStatus } from '../portfolios/property.entity';
import { Customer } from '../customers/customer.entity';
import { Interaction } from '../customers/interaction.entity';
import { Commission } from '../commissions/commission.entity';
import { User, UserRole } from '../users/user.entity';
import { Transaction } from '../transactions/transaction.entity';
import { TransactionNote } from '../transactions/transaction-note.entity';
import { AgentDue } from '../agent-dues/agent-due.entity';

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
    @InjectRepository(Transaction) private readonly transactionRepo: Repository<Transaction>,
    @InjectRepository(TransactionNote) private readonly noteRepo: Repository<TransactionNote>,
    @InjectRepository(AgentDue) private readonly agentDueRepo: Repository<AgentDue>,
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

  // Sadece liderlik tablosunu dondurur -- hem Broker Dashboard'ta hem
  // Danisman Panelim'de kullanilir (Broker-ozel getSummary'den bagimsiz,
  // ayri/kucuk bir sorgu -- mevcut calisan koda dokunmamak icin).
  async getLeaderboard(from: Date, to: Date) {
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

    return Array.from(statsByAgent.entries())
      .map(([agentId, stats]) => ({
        agentId,
        agentName: agentNameById.get(agentId) || 'Bilinmeyen',
        ...stats,
      }))
      .sort((a, b) => b.salesValue - a.salesValue || b.propertiesCount - a.propertiesCount);
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

    // 1) Portfoy onaylari (mevcut)
    const properties = await this.propertyRepo.find({
      where: [
        { status: PropertyStatus.PENDING_APPROVAL },
        { status: PropertyStatus.NEEDS_REVISION },
      ],
      order: { statusChangedAt: 'ASC', createdAt: 'ASC' },
    });
    const propertyItems = properties.map((p) => ({
      kind: 'property' as const,
      propertyId: p.id,
      title: p.title,
      status: p.status,
      agentName: p.agentId ? agentNameById.get(p.agentId) || 'Bilinmeyen' : 'Atanmamış',
      revisionNote: p.revisionNote,
      createdAt: p.createdAt,
    }));

    // 2) Kapanis onayi bekleyen islemler -- danismanin ACIKCA Broker'a
    // gonderdigi en kritik aksiyon: is bitti, komisyon onayi bekliyor.
    const closedUnapproved = await this.transactionRepo.find({
      where: { stage: 'closed' as any, dealApproved: false },
      order: { stageChangedAt: 'ASC' },
    });
    const allTxPropertyIds = closedUnapproved.map((t) => t.propertyId).filter(Boolean) as string[];
    const relatedProperties = allTxPropertyIds.length
      ? await this.propertyRepo.find({ where: { id: In(allTxPropertyIds) } })
      : [];
    const propertyTitleById = new Map(relatedProperties.map((p) => [p.id, p.title]));
    const dealItems = closedUnapproved.map((t) => ({
      kind: 'deal' as const,
      transactionId: t.id,
      title: (t.propertyId ? propertyTitleById.get(t.propertyId) : t.externalPropertyLabel) || 'İşlem',
      agentName: agentNameById.get(t.agentId) || 'Bilinmeyen',
      totalCommission: t.totalCommissionAmount,
      createdAt: t.stageChangedAt || t.createdAt,
    }));

    // 3) Isbirlikli paylasim onayi bekleyen (iki taraf da onaylamamis)
    const pendingSplits = await this.transactionRepo.find({
      where: { splitFinalizedAt: IsNull(), collaboratorAgentId: Not(IsNull()) as any },
      order: { createdAt: 'DESC' },
    });
    const splitItems = pendingSplits.map((t) => ({
      kind: 'split' as const,
      transactionId: t.id,
      title: (t.propertyId ? propertyTitleById.get(t.propertyId) : t.externalPropertyLabel) || 'İşlem',
      agentName: `${agentNameById.get(t.agentId) || 'Bilinmeyen'} & ${agentNameById.get(t.collaboratorAgentId as string) || 'Bilinmeyen'}`,
      createdAt: t.createdAt,
    }));

    // 4) Danismanin "Broker'a Bildir" ile ACIKCA bayrakladigi sorunlar --
    // bunlar da danismanin dogrudan Broker'a gonderdigi bir talep, en
    // yuksek onceliklidir.
    const flags = await this.noteRepo.find({
      where: { isBrokerFlag: true, resolved: false },
      order: { createdAt: 'DESC' },
    });
    const flagTxIds = [...new Set(flags.map((f) => f.transactionId))];
    const flagTxs = flagTxIds.length ? await this.transactionRepo.find({ where: { id: In(flagTxIds) } }) : [];
    const flagTxById = new Map(flagTxs.map((t) => [t.id, t]));
    const flagItems = flags.map((f) => {
      const tx = flagTxById.get(f.transactionId);
      return {
        kind: 'flag' as const,
        noteId: f.id,
        transactionId: f.transactionId,
        title: (tx?.propertyId ? propertyTitleById.get(tx.propertyId) : tx?.externalPropertyLabel) || 'İşlem',
        agentName: f.authorName,
        text: f.text,
        createdAt: f.createdAt,
      };
    });

    // Oncelik sirasi: danismanin ACIKCA Broker'a gonderdigi seyler
    // (bayraklar + kapanis onaylari + paylasim onaylari + portfoy
    // onaylari) hep en basta -- hepsi zaten "aksiyon bekliyor" turunde,
    // aralarinda en yeniden en eskiye siralaniyor.
    // 5) Geciken aidatlar -- mevcut ayin KENDISI degil, ONCEKI aylardan
    // odenmemis kalan kayitlar "gecikmis" sayilir. (agents/agentNameById
    // zaten fonksiyonun basinda tanimli, tekrar tanimlamiyoruz.)
    const currentPeriod = new Date().toISOString().slice(0, 7);
    const overdueDues = await this.agentDueRepo.find({ where: { paid: false }, order: { period: 'ASC' } });
    const overdueDueItems = overdueDues
      .filter((d) => d.period < currentPeriod)
      .map((d) => ({
        kind: 'overdue_due' as const,
        dueId: d.id,
        title: `Gecikmiş Aidat: ${d.period}`,
        agentName: agentNameById.get(d.agentId) || 'Bilinmeyen',
        amount: d.expectedAmount,
        createdAt: d.createdAt,
      }));

    return [...flagItems, ...dealItems, ...splitItems, ...overdueDueItems, ...propertyItems].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  }

  // Danismanin kendi sayfasinda yaptigi, Broker'in AKSIYON almasi
  // gerekmeyen ama HABERDAR olmasi faydali olan genel aktiviteler --
  // Aksiyon Merkezi'nin ALTINDA, ikinci oncelikte gosterilir.
  async getRecentAgentActivity(): Promise<
    { transactionId: string; title: string; agentName: string; text: string; createdAt: Date }[]
  > {
    const agents = await this.userRepo.find();
    const agentNameById = new Map(agents.map((a) => [a.id, a.name]));

    const notes = await this.noteRepo.find({
      where: { isBrokerFlag: false },
      order: { createdAt: 'DESC' },
      take: 20,
    });
    if (notes.length === 0) return [];

    const txIds = [...new Set(notes.map((n) => n.transactionId))];
    const txs = await this.transactionRepo.find({ where: { id: In(txIds) } });
    const txById = new Map(txs.map((t) => [t.id, t]));
    const propertyIds = txs.map((t) => t.propertyId).filter(Boolean) as string[];
    const properties = propertyIds.length ? await this.propertyRepo.find({ where: { id: In(propertyIds) } }) : [];
    const propertyTitleById = new Map(properties.map((p) => [p.id, p.title]));

    return notes.map((n) => {
      const tx = txById.get(n.transactionId);
      return {
        transactionId: n.transactionId,
        title: (tx?.propertyId ? propertyTitleById.get(tx.propertyId) : tx?.externalPropertyLabel) || 'İşlem',
        agentName: n.authorName,
        text: n.text,
        createdAt: n.createdAt,
      };
    });
  }
}
