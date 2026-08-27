import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import {
  AccountingAccount,
  AccountingAccountType,
} from './accounting-account.entity';
import {
  AccountingCommission,
  AccountingCommissionStatus,
} from './accounting-commission.entity';
import {
  AccountingRent,
  AccountingRentStatus,
} from './accounting-rent.entity';
import {
  AccountingEntry,
  AccountingEntryType,
  AccountingPartyType,
} from './accounting-entry.entity';
import { CreateAccountingAccountDto } from './dto/create-accounting-account.dto';
import {
  CreateAccountingCommissionDto,
  SettleAccountingCommissionDto,
} from './dto/create-accounting-commission.dto';
import { CreateAccountingEntryDto } from './dto/create-accounting-entry.dto';
import {
  GenerateAccountingRentsDto,
  SettleAccountingRentDto,
} from './dto/accounting-rent.dto';
import { User, UserRole } from '../users/user.entity';

const SUPPORTED_CURRENCIES = new Set(['TRY', 'USD', 'EUR']);

@Injectable()
export class AccountingService {
  constructor(
    @InjectRepository(AccountingAccount)
    private readonly accountRepo: Repository<AccountingAccount>,
    @InjectRepository(AccountingEntry)
    private readonly entryRepo: Repository<AccountingEntry>,
    @InjectRepository(AccountingCommission)
    private readonly commissionRepo: Repository<AccountingCommission>,
    @InjectRepository(AccountingRent)
    private readonly rentRepo: Repository<AccountingRent>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async listAccounts() {
    const [accounts, primaryRows, counterRows] = await Promise.all([
      this.accountRepo.find({ order: { isActive: 'DESC', createdAt: 'ASC' } }),
      this.entryRepo
        .createQueryBuilder('entry')
        .select('entry.accountId', 'accountId')
        .addSelect(
          `SUM(CASE
            WHEN entry.type = :income THEN entry.amount
            WHEN entry.type = :expense THEN -entry.amount
            WHEN entry.type = :transfer THEN -entry.amount
            ELSE 0
          END)`,
          'delta',
        )
        .where('entry.voidedAt IS NULL')
        .andWhere('entry.accountId IS NOT NULL')
        .setParameters({
          income: AccountingEntryType.INCOME,
          expense: AccountingEntryType.EXPENSE,
          transfer: AccountingEntryType.TRANSFER,
        })
        .groupBy('entry.accountId')
        .getRawMany(),
      this.entryRepo
        .createQueryBuilder('entry')
        .select('entry.counterAccountId', 'accountId')
        .addSelect('SUM(entry.amount)', 'delta')
        .where('entry.voidedAt IS NULL')
        .andWhere('entry.type = :transfer', { transfer: AccountingEntryType.TRANSFER })
        .andWhere('entry.counterAccountId IS NOT NULL')
        .groupBy('entry.counterAccountId')
        .getRawMany(),
    ]);

    const deltas = new Map<string, number>();
    for (const row of [...primaryRows, ...counterRows]) {
      deltas.set(row.accountId, (deltas.get(row.accountId) || 0) + Number(row.delta || 0));
    }

    return accounts.map((account) => ({
      ...account,
      currentBalance: Number(account.openingBalance || 0) + (deltas.get(account.id) || 0),
    }));
  }

  async createAccount(dto: CreateAccountingAccountDto) {
    this.assertCurrency(dto.currency);
    const account = this.accountRepo.create({
      type: dto.type as AccountingAccountType,
      name: dto.name.trim(),
      bankName: dto.bankName?.trim() || null,
      iban: dto.iban?.trim() || null,
      currency: dto.currency,
      openingBalance: dto.openingBalance || 0,
      isActive: true,
    });
    return this.accountRepo.save(account);
  }

  async listEntries(filters: {
    from?: string;
    to?: string;
    currency?: string;
    type?: AccountingEntryType;
  }) {
    const query = this.entryRepo
      .createQueryBuilder('entry')
      .where('entry.voidedAt IS NULL')
      .orderBy('entry.date', 'DESC')
      .addOrderBy('entry.createdAt', 'DESC');
    this.applyEntryFilters(query, filters);

    const [entries, accounts] = await Promise.all([
      query.getMany(),
      this.accountRepo.find(),
    ]);
    const accountMap = new Map(accounts.map((account) => [account.id, account]));

    return entries.map((entry) => ({
      ...entry,
      accountName: entry.accountId ? accountMap.get(entry.accountId)?.name || null : null,
      counterAccountName: entry.counterAccountId
        ? accountMap.get(entry.counterAccountId)?.name || null
        : null,
    }));
  }

  async createEntry(dto: CreateAccountingEntryDto, createdBy: string) {
    this.assertCurrency(dto.currency);

    const account = dto.accountId
      ? await this.getActiveAccount(dto.accountId)
      : null;
    const counterAccount = dto.counterAccountId
      ? await this.getActiveAccount(dto.counterAccountId)
      : null;

    if (dto.type === AccountingEntryType.TRANSFER) {
      if (!account || !counterAccount) {
        throw new BadRequestException('Transfer için kaynak ve hedef hesap seçilmelidir');
      }
      if (account.id === counterAccount.id) {
        throw new BadRequestException('Kaynak ve hedef hesap aynı olamaz');
      }
      if (account.currency !== counterAccount.currency || account.currency !== dto.currency) {
        throw new BadRequestException('Transferde hesapların para birimleri aynı olmalıdır');
      }
    } else if (!account) {
      throw new BadRequestException('Gelir veya gider için bir para hesabı seçilmelidir');
    } else if (account.currency !== dto.currency) {
      throw new BadRequestException('Hareketin para birimi hesap para birimiyle aynı olmalıdır');
    }

    const entry = this.entryRepo.create({
      type: dto.type,
      date: dto.date,
      amount: dto.amount,
      currency: dto.currency,
      accountId: account?.id || null,
      counterAccountId: counterAccount?.id || null,
      category: dto.type === AccountingEntryType.TRANSFER
        ? 'Hesaplar Arası Transfer'
        : dto.category.trim(),
      partyType: dto.partyType || null,
      partyId: dto.partyId || null,
      partyName: dto.partyName?.trim() || null,
      description: dto.description?.trim() || null,
      referenceNo: dto.referenceNo?.trim() || null,
      sourceKey: null,
      sourceType: 'manual',
      sourceId: null,
      createdBy,
      voidedAt: null,
    });

    return this.entryRepo.save(entry);
  }

  async listCommissions() {
    const [commissions, accounts] = await Promise.all([
      this.commissionRepo.find({ order: { date: 'DESC', createdAt: 'DESC' } }),
      this.accountRepo.find(),
    ]);
    const accountMap = new Map(accounts.map((account) => [account.id, account]));

    return commissions.map((commission) => ({
      ...commission,
      collectionAccountName: commission.collectionAccountId
        ? accountMap.get(commission.collectionAccountId)?.name || null
        : null,
      paymentAccountName: commission.paymentAccountId
        ? accountMap.get(commission.paymentAccountId)?.name || null
        : null,
    }));
  }

  async listRents(filters: { period?: string; currency?: string }) {
    const query = this.rentRepo
      .createQueryBuilder('rent')
      .where('1 = 1')
      .orderBy('rent.period', 'DESC')
      .addOrderBy('rent.agentNameSnapshot', 'ASC');
    if (filters.period) query.andWhere('rent.period = :period', { period: filters.period });
    if (filters.currency) query.andWhere('rent.currency = :currency', { currency: filters.currency });

    const [rents, accounts] = await Promise.all([
      query.getMany(),
      this.accountRepo.find(),
    ]);
    const accountMap = new Map(accounts.map((account) => [account.id, account]));
    return rents.map((rent) => ({
      ...rent,
      collectionAccountName: rent.collectionAccountId
        ? accountMap.get(rent.collectionAccountId)?.name || null
        : null,
    }));
  }

  async generateRents(dto: GenerateAccountingRentsDto, createdBy: string) {
    this.assertCurrency(dto.currency);
    if (dto.currency !== 'TRY') {
      throw new BadRequestException('Danışman kira tutarı ilk sürümde yalnızca TL olarak tanımlıdır');
    }

    const [agents, existingRents] = await Promise.all([
      this.userRepo.find({ where: { role: UserRole.AGENT, isActive: true } }),
      this.rentRepo.find({ where: { period: dto.period } }),
    ]);
    const existingAgentIds = new Set(existingRents.map((rent) => rent.agentId));
    const newRents: AccountingRent[] = [];
    let skipped = 0;

    for (const agent of agents) {
      const amount = Number(agent.monthlyDuesAmount);
      const startPeriod = agent.duesStartDate?.slice(0, 7);
      if (!Number.isFinite(amount) || amount <= 0 || (startPeriod && dto.period < startPeriod) || existingAgentIds.has(agent.id)) {
        skipped++;
        continue;
      }

      newRents.push(this.rentRepo.create({
        agentId: agent.id,
        agentNameSnapshot: agent.name,
        period: dto.period,
        dueDate: `${dto.period}-01`,
        amount: this.money(amount),
        currency: 'TRY',
        status: AccountingRentStatus.PENDING,
        collectionAccountId: null,
        collectionEntryId: null,
        collectedAt: null,
        notes: null,
        voidedAt: null,
        createdBy,
      }));
    }

    if (newRents.length > 0) {
      await this.rentRepo.save(newRents, { chunk: 100 });
    }
    return { period: dto.period, currency: 'TRY', created: newRents.length, skipped };
  }

  async collectRent(id: string, dto: SettleAccountingRentDto, createdBy: string) {
    const rent = await this.getRent(id);
    if (rent.status !== AccountingRentStatus.PENDING) {
      throw new BadRequestException('Bu kira tahakkuku zaten tahsil edilmiş veya kapatılmış');
    }

    const account = await this.getActiveAccount(dto.accountId);
    if (account.currency !== rent.currency) {
      throw new BadRequestException('Tahsilat hesabının para birimi kira kaydıyla aynı olmalıdır');
    }

    const entry = this.entryRepo.create({
      type: AccountingEntryType.INCOME,
      date: dto.date,
      amount: rent.amount,
      currency: rent.currency,
      accountId: account.id,
      counterAccountId: null,
      category: 'Danışman Kirası Tahsilatı',
      partyType: AccountingPartyType.AGENT,
      partyId: rent.agentId,
      partyName: rent.agentNameSnapshot,
      description: `Danışman kirası: ${rent.period}`,
      referenceNo: null,
      sourceKey: `rent:${rent.id}:collection`,
      sourceType: 'accounting_rent_collection',
      sourceId: rent.id,
      createdBy,
      voidedAt: null,
    });
    const savedEntry = await this.entryRepo.save(entry);

    rent.status = AccountingRentStatus.COLLECTED;
    rent.collectionAccountId = account.id;
    rent.collectionEntryId = savedEntry.id;
    rent.collectedAt = dto.date;
    rent.notes = dto.notes?.trim() || rent.notes;
    return this.rentRepo.save(rent);
  }

  async voidRent(id: string, createdBy: string) {
    const rent = await this.getRent(id);
    if (rent.status !== AccountingRentStatus.PENDING) {
      throw new ConflictException('Yalnızca tahsil edilmemiş kira tahakkukları iptal edilebilir');
    }
    rent.status = AccountingRentStatus.VOIDED;
    rent.voidedAt = new Date();
    rent.updatedAt = new Date();
    rent.notes = [rent.notes, `İptal edildi (${createdBy})`].filter(Boolean).join(' · ');
    return this.rentRepo.save(rent);
  }

  async createCommission(dto: CreateAccountingCommissionDto, createdBy: string) {
    this.assertCurrency(dto.currency);

    const idempotencyKey = dto.idempotencyKey?.trim() || null;
    if (idempotencyKey) {
      const existing = await this.commissionRepo.findOne({ where: { idempotencyKey } });
      if (existing) return existing;
    }

    const agent = await this.userRepo.findOne({
      where: { id: dto.agentId, role: UserRole.AGENT },
    });
    if (!agent) {
      throw new NotFoundException('Danışman bulunamadı');
    }

    const sharePercent = Number(agent.commissionSharePercentage);
    if (!Number.isFinite(sharePercent) || sharePercent < 0 || sharePercent > 100) {
      throw new BadRequestException('Danışmanın kayıt ekranındaki komisyon payı geçerli değil');
    }

    const grossAmount = this.money(dto.grossAmount);
    const agentGrossShare = this.money((grossAmount * sharePercent) / 100);
    const officeShare = this.money(grossAmount - agentGrossShare);

    const commission = this.commissionRepo.create({
      agentId: agent.id,
      idempotencyKey,
      agentNameSnapshot: agent.name,
      transactionType: dto.transactionType,
      propertyTitle: dto.propertyTitle?.trim() || null,
      date: dto.date,
      grossAmount,
      currency: dto.currency,
      agentSharePercent: sharePercent,
      agentGrossShare,
      officeShare,
      status: AccountingCommissionStatus.PENDING,
      collectionAccountId: null,
      collectionEntryId: null,
      collectedAt: null,
      paymentAccountId: null,
      paymentEntryId: null,
      paidAt: null,
      notes: dto.notes?.trim() || null,
      voidedAt: null,
      createdBy,
    });

    try {
      return await this.commissionRepo.save(commission);
    } catch (error: any) {
      // Aynı form gönderimi iki istek olarak aynı anda geldiyse, unique
      // idempotency anahtarı nedeniyle ikinci isteği mevcut kayda bağla.
      if (idempotencyKey && error?.code === '23505') {
        const existing = await this.commissionRepo.findOne({ where: { idempotencyKey } });
        if (existing) return existing;
      }
      throw error;
    }
  }

  async voidCommission(id: string, createdBy: string) {
    const commission = await this.getCommission(id);
    if (commission.status !== AccountingCommissionStatus.PENDING) {
      throw new ConflictException('Yalnızca henüz tahsil edilmemiş komisyonlar iptal edilebilir');
    }
    commission.status = AccountingCommissionStatus.VOIDED;
    commission.voidedAt = new Date();
    commission.updatedAt = new Date();
    commission.notes = [commission.notes, `İptal edildi (${createdBy})`].filter(Boolean).join(' · ');
    return this.commissionRepo.save(commission);
  }

  async collectCommission(
    id: string,
    dto: SettleAccountingCommissionDto,
    createdBy: string,
  ) {
    const commission = await this.getCommission(id);
    if (commission.status !== AccountingCommissionStatus.PENDING) {
      throw new BadRequestException('Bu komisyon zaten tahsil edilmiş veya kapatılmış');
    }

    const account = await this.getActiveAccount(dto.accountId);
    if (account.currency !== commission.currency) {
      throw new BadRequestException('Tahsilat hesabının para birimi komisyonla aynı olmalıdır');
    }

    const entry = this.entryRepo.create({
      type: AccountingEntryType.INCOME,
      date: dto.date,
      amount: commission.grossAmount,
      currency: commission.currency,
      accountId: account.id,
      counterAccountId: null,
      category: 'Komisyon Tahsilatı',
      partyType: AccountingPartyType.AGENT,
      partyId: commission.agentId,
      partyName: commission.agentNameSnapshot,
      description: commission.propertyTitle
        ? `Komisyon tahsilatı: ${commission.propertyTitle}`
        : 'Komisyon tahsilatı',
      referenceNo: null,
      sourceKey: `commission:${commission.id}:collection`,
      sourceType: 'accounting_commission_collection',
      sourceId: commission.id,
      createdBy,
      voidedAt: null,
    });
    const savedEntry = await this.entryRepo.save(entry);

    commission.status = AccountingCommissionStatus.COLLECTED;
    commission.collectionAccountId = account.id;
    commission.collectionEntryId = savedEntry.id;
    commission.collectedAt = dto.date;
    return this.commissionRepo.save(commission);
  }

  async payCommission(
    id: string,
    dto: SettleAccountingCommissionDto,
    createdBy: string,
  ) {
    const commission = await this.getCommission(id);
    if (commission.status !== AccountingCommissionStatus.COLLECTED) {
      throw new BadRequestException('Danışman ödemesi için önce komisyon tahsil edilmelidir');
    }

    const account = await this.getActiveAccount(dto.accountId);
    if (account.currency !== commission.currency) {
      throw new BadRequestException('Ödeme hesabının para birimi komisyonla aynı olmalıdır');
    }

    const entry = this.entryRepo.create({
      type: AccountingEntryType.EXPENSE,
      date: dto.date,
      amount: commission.agentGrossShare,
      currency: commission.currency,
      accountId: account.id,
      counterAccountId: null,
      category: 'Danışman Hakedişi Ödemesi',
      partyType: AccountingPartyType.AGENT,
      partyId: commission.agentId,
      partyName: commission.agentNameSnapshot,
      description: commission.propertyTitle
        ? `Danışman hakedişi: ${commission.propertyTitle}`
        : 'Danışman hakedişi ödemesi',
      referenceNo: null,
      sourceKey: `commission:${commission.id}:agent-payment`,
      sourceType: 'accounting_commission_payment',
      sourceId: commission.id,
      createdBy,
      voidedAt: null,
    });
    const savedEntry = await this.entryRepo.save(entry);

    commission.status = AccountingCommissionStatus.PAID;
    commission.paymentAccountId = account.id;
    commission.paymentEntryId = savedEntry.id;
    commission.paidAt = dto.date;
    return this.commissionRepo.save(commission);
  }

  async getSummary(filters: { from?: string; to?: string; currency?: string }) {
    const query = this.entryRepo
      .createQueryBuilder('entry')
      .select(
        `COALESCE(SUM(CASE WHEN entry.type = :income THEN entry.amount ELSE 0 END), 0)`,
        'totalIncome',
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN entry.type = :expense THEN entry.amount ELSE 0 END), 0)`,
        'totalExpense',
      )
      .addSelect('COUNT(entry.id)', 'entryCount')
      .where('entry.voidedAt IS NULL')
      .setParameters({
        income: AccountingEntryType.INCOME,
        expense: AccountingEntryType.EXPENSE,
      });
    this.applyEntryFilters(query, filters);

    const row = await query.getRawOne();
    const income = Number(row?.totalIncome || 0);
    const expense = Number(row?.totalExpense || 0);

    return {
      currency: filters.currency || 'ALL',
      totalIncome: income,
      totalExpense: expense,
      netOperatingResult: income - expense,
      entryCount: Number(row?.entryCount || 0),
    };
  }

  private async getRent(id: string) {
    const rent = await this.rentRepo.findOne({ where: { id } });
    if (!rent) {
      throw new NotFoundException('Danışman kira tahakkuku bulunamadı');
    }
    return rent;
  }

  private async getCommission(id: string) {
    const commission = await this.commissionRepo.findOne({ where: { id } });
    if (!commission) {
      throw new NotFoundException('Muhasebe komisyonu bulunamadı');
    }
    return commission;
  }

  private async getActiveAccount(id: string) {
    const account = await this.accountRepo.findOne({ where: { id, isActive: true } });
    if (!account) {
      throw new NotFoundException('Muhasebe hesabı bulunamadı veya pasif durumda');
    }
    return account;
  }

  private applyEntryFilters(
    query: SelectQueryBuilder<AccountingEntry>,
    filters: { from?: string; to?: string; currency?: string; type?: AccountingEntryType },
  ) {
    if (filters.from) query.andWhere('entry.date >= :from', { from: filters.from });
    if (filters.to) query.andWhere('entry.date <= :to', { to: filters.to });
    if (filters.currency) query.andWhere('entry.currency = :currency', { currency: filters.currency });
    if (filters.type) query.andWhere('entry.type = :entryType', { entryType: filters.type });
  }

  private money(value: number) {
    return Number(Number(value).toFixed(2));
  }

  private assertCurrency(currency: string) {
    if (!SUPPORTED_CURRENCIES.has(currency)) {
      throw new BadRequestException('Para birimi TRY, USD veya EUR olmalıdır');
    }
  }
}
