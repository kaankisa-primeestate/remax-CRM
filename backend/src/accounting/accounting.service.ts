import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository, SelectQueryBuilder } from 'typeorm';
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
  AccountingParty,
  AccountingPartyBalanceDirection,
} from './accounting-party.entity';
import { AccountingRecurringExpense } from './accounting-recurring-expense.entity';
import { AccountingCategory } from './accounting-category.entity';
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
import { CreateAccountingPartyDto } from './dto/create-accounting-party.dto';
import {
  CreateAccountingRecurringExpenseDto,
  GenerateAccountingRecurringExpenseDto,
} from './dto/accounting-recurring-expense.dto';
import { CreateAccountingCategoryDto } from './dto/create-accounting-category.dto';
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
    @InjectRepository(AccountingParty)
    private readonly partyRepo: Repository<AccountingParty>,
    @InjectRepository(AccountingRecurringExpense)
    private readonly recurringExpenseRepo: Repository<AccountingRecurringExpense>,
    @InjectRepository(AccountingCategory)
    private readonly categoryRepo: Repository<AccountingCategory>,
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
    const name = dto.name.trim();
    if (!name) throw new BadRequestException('Hesap adı boş bırakılamaz');
    const account = this.accountRepo.create({
      type: dto.type as AccountingAccountType,
      name,
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
    const category = dto.category.trim();
    if (dto.type !== AccountingEntryType.TRANSFER && !category) {
      throw new BadRequestException('Gelir veya gider kategorisi boş bırakılamaz');
    }
    if (dto.type === AccountingEntryType.TRANSFER && (dto.partyType || dto.partyId || dto.partyName)) {
      throw new BadRequestException('Transfer hareketi cari kart bilgisi içeremez');
    }
    if (dto.partyId && !dto.partyType) {
      throw new BadRequestException('Cari hareket için cari kart türü de belirtilmelidir');
    }

    const sourceKey = dto.idempotencyKey?.trim() ? `manual:${dto.idempotencyKey.trim()}` : null;
    if (sourceKey) {
      const existing = await this.entryRepo.findOne({ where: { sourceKey } });
      if (existing) return existing;
    }

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

    if (dto.partyId) {
      if (dto.partyType === AccountingPartyType.AGENT) {
        const agent = await this.userRepo.findOne({ where: { id: dto.partyId, role: UserRole.AGENT } });
        if (!agent) throw new BadRequestException('Seçilen danışman cari kartı bulunamadı');
        if (dto.currency !== 'TRY') throw new BadRequestException('Danışman cari hareketleri ilk sürümde yalnızca TL olabilir');
      } else {
        const party = await this.partyRepo.findOne({ where: { id: dto.partyId, type: dto.partyType, isActive: true } });
        if (!party) throw new BadRequestException('Seçilen cari kart bulunamadı veya türü eşleşmiyor');
        if (party.currency !== dto.currency) throw new BadRequestException('Cari kart ve hareket para birimi aynı olmalıdır');
      }
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
        : category,
      partyType: dto.partyType || null,
      partyId: dto.partyId || null,
      partyName: dto.partyName?.trim() || null,
      description: dto.description?.trim() || null,
      referenceNo: dto.referenceNo?.trim() || null,
      sourceKey,
      sourceType: 'manual',
      sourceId: null,
      createdBy,
      voidedAt: null,
    });

    try {
      return await this.entryRepo.save(entry);
    } catch (error: any) {
      if (sourceKey && error?.code === '23505') {
        const existing = await this.entryRepo.findOne({ where: { sourceKey } });
        if (existing) return existing;
      }
      throw error;
    }
  }

  async voidEntry(id: string, createdBy: string) {
    const entry = await this.entryRepo.findOne({ where: { id, voidedAt: IsNull() } });
    if (!entry) throw new NotFoundException('Aktif muhasebe hareketi bulunamadı');
    if (!['manual', 'accounting_recurring_expense'].includes(entry.sourceType || '')) {
      throw new ConflictException('Komisyon ve kira hareketleri kendi ekranından iptal edilmelidir');
    }
    entry.voidedAt = new Date();
    entry.description = [entry.description, `İptal edildi (${createdBy})`].filter(Boolean).join(' · ');
    return this.entryRepo.save(entry);
  }

  async listParties(filters: { currency?: string }) {
    const [parties, agents, entryRows, commissionRows, rentRows] = await Promise.all([
      this.partyRepo.find({ where: { isActive: true }, order: { name: 'ASC' } }),
      this.userRepo.find({ where: { role: UserRole.AGENT }, order: { name: 'ASC' } }),
      this.entryRepo
        .createQueryBuilder('entry')
        .select('entry.partyId', 'partyId')
        .addSelect('entry.partyType', 'partyType')
        .addSelect('entry.currency', 'currency')
        .addSelect(`SUM(CASE WHEN entry.type = '${AccountingEntryType.INCOME}' THEN entry.amount ELSE 0 END)`, 'income')
        .addSelect(`SUM(CASE WHEN entry.type = '${AccountingEntryType.EXPENSE}' THEN entry.amount ELSE 0 END)`, 'expense')
        .addSelect('entry.category', 'category')
        .addSelect('COUNT(entry.id)', 'movementCount')
        .where('entry.voidedAt IS NULL')
        .andWhere('entry.partyId IS NOT NULL')
        .groupBy('entry.partyId')
        .addGroupBy('entry.partyType')
        .addGroupBy('entry.currency')
        .addGroupBy('entry.category')
        .getRawMany(),
      this.commissionRepo
        .createQueryBuilder('commission')
        .select('commission.agentId', 'agentId')
        .addSelect('commission.currency', 'currency')
        .addSelect('SUM(commission.agentGrossShare)', 'payable')
        .where('commission.status = :collected', { collected: AccountingCommissionStatus.COLLECTED })
        .groupBy('commission.agentId')
        .addGroupBy('commission.currency')
        .getRawMany(),
      this.rentRepo
        .createQueryBuilder('rent')
        .select('rent.agentId', 'agentId')
        .addSelect('rent.currency', 'currency')
        .addSelect('SUM(rent.amount)', 'receivable')
        .where('rent.status = :pending', { pending: AccountingRentStatus.PENDING })
        .groupBy('rent.agentId')
        .addGroupBy('rent.currency')
        .getRawMany(),
    ]);

    const existingByUserId = new Map(parties.filter((party) => party.linkedUserId).map((party) => [party.linkedUserId, party]));
    const missingAgents = agents
      .filter((agent) => !existingByUserId.has(agent.id))
      .map((agent) => this.partyRepo.create({
        type: AccountingPartyType.AGENT,
        name: agent.name,
        linkedUserId: agent.id,
        companyName: agent.companyName || null,
        phone: agent.phone || null,
        taxId: agent.taxId || null,
        currency: 'TRY',
        openingBalance: 0,
        openingBalanceDirection: AccountingPartyBalanceDirection.RECEIVABLE,
        isActive: true,
      }));
    if (missingAgents.length > 0) await this.partyRepo.save(missingAgents, { chunk: 100 });
    const allParties = [...parties, ...missingAgents];
    const entryMap = new Map<string, { income: number; expense: number; movementCount: number; byCategory: Map<string, { income: number; expense: number }> }>();
    for (const row of entryRows) {
      const key = `${row.partyType}:${row.partyId}:${row.currency}`;
      const current = entryMap.get(key) || { income: 0, expense: 0, movementCount: 0, byCategory: new Map() };
      const income = Number(row.income || 0);
      const expense = Number(row.expense || 0);
      current.income += income;
      current.expense += expense;
      current.movementCount += Number(row.movementCount || 0);
      const categoryKey = row.category || '';
      const categoryCurrent = current.byCategory.get(categoryKey) || { income: 0, expense: 0 };
      categoryCurrent.income += income;
      categoryCurrent.expense += expense;
      current.byCategory.set(categoryKey, categoryCurrent);
      entryMap.set(key, current);
    }
    const commissionMap = new Map(commissionRows.map((row) => [`${row.agentId}:${row.currency}`, Number(row.payable || 0)]));
    const rentMap = new Map(rentRows.map((row) => [`${row.agentId}:${row.currency}`, Number(row.receivable || 0)]));

    return allParties
      .filter((party) => !filters.currency || party.currency === filters.currency || party.type === AccountingPartyType.AGENT)
      .map((party) => {
        const currency = party.type === AccountingPartyType.AGENT ? 'TRY' : party.currency;
        const entry = entryMap.get(`${party.type}:${party.linkedUserId || party.id}:${currency}`) || { income: 0, expense: 0, movementCount: 0, byCategory: new Map() };
        const opening = Number(party.openingBalance || 0);
        const openingReceivable = party.openingBalanceDirection === AccountingPartyBalanceDirection.RECEIVABLE ? opening : 0;
        const openingPayable = party.openingBalanceDirection === AccountingPartyBalanceDirection.PAYABLE ? opening : 0;
        const rentReceivable = party.linkedUserId ? (rentMap.get(`${party.linkedUserId}:${currency}`) || 0) : 0;
        const commissionPayable = party.linkedUserId ? (commissionMap.get(`${party.linkedUserId}:${currency}`) || 0) : 0;
        let receivable = openingReceivable + rentReceivable;
        let payable = openingPayable + commissionPayable;
        if (party.type === AccountingPartyType.AGENT) {
          // Kira tahsilatı danışmanın şirkete borcunu azaltır; komisyon tahsilatı
          // danışman carisini değiştirmez. Diğer danışman hareketleri hakediş
          // borcunu artırır/azaltır ve ekstre mantığıyla aynı tutulur.
          const rentCollection = entry.byCategory.get('Danışman Kirası Tahsilatı');
          const commissionCollection = entry.byCategory.get('Komisyon Tahsilatı');
          receivable -= Number(rentCollection?.income || 0);
          payable += entry.income - entry.expense
            - Number(rentCollection?.income || 0)
            - Number(commissionCollection?.income || 0);
        } else if (party.type === AccountingPartyType.PARTNER) {
          // Şirkete giren ortak parası, ortaklar cari hesabında şirketin borcudur;
          // ortağa yapılan çekiş/geri ödeme bu borcu azaltır.
          payable += entry.income - entry.expense;
        } else if (party.type === AccountingPartyType.CUSTOMER) {
          // Müşteriden gelen tahsilat alacağı azaltır; müşteriye yapılan iade/
          // ödeme ise alacağı artırır.
          receivable += entry.expense - entry.income;
        } else {
          // Tedarikçi ve diğer cari kartlarda şirkete giriş borcu artırır,
          // şirkete ait ödeme borcu azaltır.
          payable += entry.income - entry.expense;
        }
        receivable = this.money(Math.max(0, receivable));
        payable = this.money(Math.max(0, payable));
        return {
          ...party,
          currency,
          receivable,
          payable,
          balance: this.money(receivable - payable),
          incomeMovement: this.money(entry.income),
          expenseMovement: this.money(entry.expense),
          movementCount: entry.movementCount,
          pendingRentCount: party.linkedUserId ? rentRows.filter((row) => row.agentId === party.linkedUserId && row.currency === currency && row.status === AccountingRentStatus.PENDING).length : 0,
          pendingCommissionAmount: commissionPayable,
        };
      });
  }

  async createParty(dto: CreateAccountingPartyDto) {
    this.assertCurrency(dto.currency);
    if (dto.type === AccountingPartyType.AGENT) {
      throw new BadRequestException('Danışman cari kartları Danışman kayıtlarından otomatik oluşturulur');
    }
    const name = dto.name.trim();
    if (!name) throw new BadRequestException('Cari kart adı boş bırakılamaz');
    const party = this.partyRepo.create({
      type: dto.type as AccountingPartyType,
      name,
      linkedUserId: null,
      companyName: dto.companyName?.trim() || null,
      phone: dto.phone?.trim() || null,
      taxId: dto.taxId?.trim() || null,
      currency: dto.currency,
      openingBalance: this.money(dto.openingBalance || 0),
      openingBalanceDirection: dto.openingBalanceDirection || AccountingPartyBalanceDirection.RECEIVABLE,
      isActive: true,
    });
    return this.partyRepo.save(party);
  }

  async listPartyEntries(partyId: string) {
    const party = await this.partyRepo.findOne({ where: { id: partyId } });
    if (!party) throw new NotFoundException('Cari kart bulunamadı');
    const entryPartyId = party.linkedUserId || partyId;
    const [entries, accounts, rents, commissions] = await Promise.all([
      this.entryRepo.find({
        where: { partyId: entryPartyId, voidedAt: IsNull() },
        order: { date: 'ASC', createdAt: 'ASC' },
      }),
      this.accountRepo.find(),
      party.linkedUserId
        ? this.rentRepo.find({ where: { agentId: party.linkedUserId }, order: { dueDate: 'ASC', createdAt: 'ASC' } })
        : Promise.resolve([]),
      party.linkedUserId
        ? this.commissionRepo.find({ where: { agentId: party.linkedUserId }, order: { date: 'ASC', createdAt: 'ASC' } })
        : Promise.resolve([]),
    ]);
    const accountMap = new Map(accounts.map((account) => [account.id, account]));
    const statementEntries: Array<Record<string, any>> = [];
    const addEntry = (entry: Record<string, any>) => statementEntries.push(entry);
    const entryDelta = (entry: AccountingEntry) => {
      let receivableDelta = 0;
      let payableDelta = 0;
      if (party.type === AccountingPartyType.PARTNER) {
        payableDelta = entry.type === AccountingEntryType.INCOME ? Number(entry.amount) : -Number(entry.amount);
      } else if (party.type === AccountingPartyType.CUSTOMER) {
        receivableDelta = entry.type === AccountingEntryType.INCOME ? -Number(entry.amount) : Number(entry.amount);
      } else if (party.type === AccountingPartyType.AGENT) {
        if (entry.category === 'Danışman Kirası Tahsilatı') {
          receivableDelta = -Number(entry.amount);
        } else if (entry.category === 'Komisyon Tahsilatı') {
          receivableDelta = 0;
        } else {
          payableDelta = entry.type === AccountingEntryType.INCOME ? Number(entry.amount) : -Number(entry.amount);
        }
      } else {
        payableDelta = entry.type === AccountingEntryType.INCOME ? Number(entry.amount) : -Number(entry.amount);
      }
      return { receivableDelta: this.money(receivableDelta), payableDelta: this.money(payableDelta) };
    };

    const openingAmount = Number(party.openingBalance || 0);
    if (openingAmount > 0) {
      addEntry({
        id: `opening:${party.id}`,
        date: party.createdAt ? new Date(party.createdAt).toISOString().slice(0, 10) : null,
        type: 'opening_balance',
        category: 'Açılış bakiyesi',
        amount: this.money(openingAmount),
        currency: party.currency,
        accountName: null,
        counterAccountName: null,
        partyName: party.name,
        description: party.openingBalanceDirection === AccountingPartyBalanceDirection.RECEIVABLE
          ? 'Şirketten alacak açılış bakiyesi'
          : 'Şirkete borç açılış bakiyesi',
        statusLabel: party.openingBalanceDirection === AccountingPartyBalanceDirection.RECEIVABLE ? 'Şirket alacağı' : 'Şirket borcu',
        receivableDelta: party.openingBalanceDirection === AccountingPartyBalanceDirection.RECEIVABLE ? this.money(openingAmount) : 0,
        payableDelta: party.openingBalanceDirection === AccountingPartyBalanceDirection.PAYABLE ? this.money(openingAmount) : 0,
        createdAt: party.createdAt,
      });
    }

    for (const rent of rents) {
      if (rent.status === AccountingRentStatus.VOIDED || rent.voidedAt) continue;
      addEntry({
        id: `rent:${rent.id}`,
        date: rent.dueDate,
        type: 'rent_accrual',
        category: 'Danışman Kirası Tahakkuku',
        amount: this.money(rent.amount),
        currency: rent.currency,
        accountName: null,
        counterAccountName: null,
        partyName: rent.agentNameSnapshot,
        description: `Danışman kirası: ${rent.period}`,
        statusLabel: rent.status === AccountingRentStatus.COLLECTED ? 'Tahsil edildi' : 'Tahsilat bekliyor',
        receivableDelta: this.money(rent.amount),
        payableDelta: 0,
        createdAt: rent.createdAt,
      });
    }

    for (const commission of commissions) {
      if (commission.status === AccountingCommissionStatus.VOIDED || commission.voidedAt) continue;
      const commissionIsPayable = commission.status === AccountingCommissionStatus.COLLECTED || commission.status === AccountingCommissionStatus.PAID;
      addEntry({
        id: `commission:${commission.id}`,
        date: commission.date,
        type: 'commission_accrual',
        category: 'Danışman Hakedişi Tahakkuku',
        amount: this.money(commission.agentGrossShare),
        currency: commission.currency,
        accountName: null,
        counterAccountName: null,
        partyName: commission.agentNameSnapshot,
        description: commission.propertyTitle || 'Komisyon hakedişi',
        statusLabel: commission.status === AccountingCommissionStatus.PENDING ? 'Komisyon tahsilatı bekliyor' : commission.status === AccountingCommissionStatus.COLLECTED ? 'Danışmana ödeme bekliyor' : 'Danışmana ödendi',
        receivableDelta: 0,
        payableDelta: commissionIsPayable ? this.money(commission.agentGrossShare) : 0,
        createdAt: commission.createdAt,
      });
    }

    for (const entry of entries) {
      const deltas = entryDelta(entry);
      addEntry({
        ...entry,
        accountName: entry.accountId ? accountMap.get(entry.accountId)?.name || null : null,
        counterAccountName: entry.counterAccountId ? accountMap.get(entry.counterAccountId)?.name || null : null,
        statusLabel: entry.type === AccountingEntryType.INCOME ? 'Tahsilat / giriş' : entry.type === AccountingEntryType.EXPENSE ? 'Ödeme / çıkış' : 'Transfer',
        ...deltas,
      });
    }

    statementEntries.sort((left, right) => {
      const dateCompare = String(left.date || '').localeCompare(String(right.date || ''));
      if (dateCompare !== 0) return dateCompare;
      return String(left.createdAt || '').localeCompare(String(right.createdAt || ''));
    });
    return {
      party: {
        ...party,
        currency: party.type === AccountingPartyType.AGENT ? 'TRY' : party.currency,
      },
      entries: statementEntries,
    };
  }

  async listCategories(filters: { type?: AccountingEntryType }) {
    const where = filters.type
      ? { type: filters.type, isActive: true }
      : { isActive: true };
    return this.categoryRepo.find({
      where,
      order: { type: 'ASC', name: 'ASC' },
    });
  }

  async createCategory(dto: CreateAccountingCategoryDto) {
    if (dto.type === AccountingEntryType.TRANSFER) {
      throw new BadRequestException('Hesaplar arası transfer için kategori oluşturulamaz');
    }
    const name = dto.name.trim().replace(/\s+/g, ' ');
    if (!name) throw new BadRequestException('Kategori adı boş bırakılamaz');
    const existing = await this.categoryRepo.findOne({ where: { type: dto.type, name } });
    if (existing) return existing;
    return this.categoryRepo.save(this.categoryRepo.create({
      type: dto.type,
      name,
      isActive: true,
    }));
  }

  async listRecurringExpenses(filters: { currency?: string }) {
    const [templates, accounts, parties] = await Promise.all([
      this.recurringExpenseRepo.find({ where: { isActive: true }, order: { title: 'ASC' } }),
      this.accountRepo.find(),
      this.partyRepo.find({ where: { isActive: true } }),
    ]);
    const accountMap = new Map(accounts.map((account) => [account.id, account]));
    const partyMap = new Map(parties.map((party) => [party.id, party]));
    return templates
      .filter((template) => !filters.currency || template.currency === filters.currency)
      .map((template) => ({
        ...template,
        accountName: accountMap.get(template.defaultAccountId)?.name || null,
        partyName: template.partyId ? partyMap.get(template.partyId)?.name || template.partyName : template.partyName,
      }));
  }

  async createRecurringExpense(dto: CreateAccountingRecurringExpenseDto, createdBy: string) {
    this.assertCurrency(dto.currency);
    if (dto.endPeriod && dto.endPeriod < dto.startPeriod) {
      throw new BadRequestException('Bitiş dönemi başlangıç döneminden önce olamaz');
    }
    const account = await this.getActiveAccount(dto.defaultAccountId);
    if (account.currency !== dto.currency) {
      throw new BadRequestException('Gider şablonu ve ödeme hesabının para birimi aynı olmalıdır');
    }
    let partyName: string | null = null;
    if (dto.partyId) {
      const party = await this.partyRepo.findOne({ where: { id: dto.partyId, isActive: true } });
      if (!party) throw new NotFoundException('Giderin cari kartı bulunamadı');
      if (party.currency !== dto.currency) throw new BadRequestException('Gider şablonu ve cari kartın para birimi aynı olmalıdır');
      partyName = party.name;
    }
    const title = dto.title.trim();
    const category = dto.category.trim();
    if (!title) throw new BadRequestException('Tekrarlayan gider adı boş bırakılamaz');
    if (!category) throw new BadRequestException('Tekrarlayan gider kategorisi boş bırakılamaz');
    const template = this.recurringExpenseRepo.create({
      title,
      category,
      amount: this.money(dto.amount),
      currency: dto.currency,
      dueDay: dto.dueDay,
      startPeriod: dto.startPeriod,
      endPeriod: dto.endPeriod || null,
      defaultAccountId: account.id,
      partyId: dto.partyId || null,
      partyName,
      isActive: true,
    });
    return this.recurringExpenseRepo.save(template);
  }

  async generateRecurringExpenses(dto: GenerateAccountingRecurringExpenseDto, createdBy: string) {
    this.assertCurrency(dto.currency);
    const [templates, accounts, parties, existing] = await Promise.all([
      this.recurringExpenseRepo.find({ where: { isActive: true, currency: dto.currency } }),
      this.accountRepo.find({ where: { isActive: true, currency: dto.currency } }),
      this.partyRepo.find({ where: { isActive: true } }),
      this.entryRepo.find({ where: { sourceType: 'accounting_recurring_expense' } }),
    ]);
    const accountMap = new Map(accounts.map((account) => [account.id, account]));
    const partyMap = new Map(parties.map((party) => [party.id, party]));
    const existingKeys = new Set(existing.map((entry) => entry.sourceKey).filter(Boolean));
    const entries: AccountingEntry[] = [];
    let skipped = 0;

    for (const template of templates) {
      if (dto.period < template.startPeriod || (template.endPeriod && dto.period > template.endPeriod)) {
        skipped++;
        continue;
      }
      const sourceKey = `recurring-expense:${template.id}:${dto.period}`;
      if (existingKeys.has(sourceKey)) {
        skipped++;
        continue;
      }
      const account = accountMap.get(template.defaultAccountId);
      if (!account) {
        skipped++;
        continue;
      }
      const [year, month] = dto.period.split('-').map(Number);
      const lastDay = new Date(year, month, 0).getDate();
      const dueDay = Math.min(template.dueDay, lastDay);
      const party = template.partyId ? partyMap.get(template.partyId) : null;
      entries.push(this.entryRepo.create({
        type: AccountingEntryType.EXPENSE,
        date: `${dto.period}-${String(dueDay).padStart(2, '0')}`,
        amount: template.amount,
        currency: template.currency,
        accountId: account.id,
        counterAccountId: null,
        category: template.category,
        partyType: party?.type || null,
        partyId: party?.linkedUserId || party?.id || null,
        partyName: party?.name || template.partyName || null,
        description: `${template.title} · ${dto.period}`,
        referenceNo: null,
        sourceKey,
        sourceType: 'accounting_recurring_expense',
        sourceId: template.id,
        createdBy,
        voidedAt: null,
      }));
    }
    if (entries.length > 0) await this.entryRepo.save(entries, { chunk: 100 });
    return { period: dto.period, currency: dto.currency, created: entries.length, skipped };
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

  async getManagementReport(filters: { from?: string; to?: string; currency?: string }) {
    const entryQuery = this.entryRepo
      .createQueryBuilder('entry')
      .where('entry.voidedAt IS NULL');
    this.applyEntryFilters(entryQuery, filters);

    const [entries, accounts, priorEntries, pendingRents, pendingCommissions] = await Promise.all([
      entryQuery.orderBy('entry.date', 'ASC').addOrderBy('entry.createdAt', 'ASC').getMany(),
      this.accountRepo.find({ order: { name: 'ASC' } }),
      filters.from
        ? this.entryRepo
          .createQueryBuilder('entry')
          .where('entry.voidedAt IS NULL')
          .andWhere('entry.date < :from', { from: filters.from })
          .andWhere(filters.currency ? 'entry.currency = :currency' : '1 = 1', filters.currency ? { currency: filters.currency } : {})
          .getMany()
        : Promise.resolve([]),
      this.rentRepo.find({ where: { status: AccountingRentStatus.PENDING } }),
      this.commissionRepo.find({
        where: [
          { status: AccountingCommissionStatus.PENDING },
          { status: AccountingCommissionStatus.COLLECTED },
        ],
      }),
    ]);

    const getAccountDelta = (entry: AccountingEntry, accountId: string) => {
      let delta = 0;
      if (entry.accountId === accountId) {
        delta += entry.type === AccountingEntryType.INCOME
          ? Number(entry.amount)
          : entry.type === AccountingEntryType.EXPENSE || entry.type === AccountingEntryType.TRANSFER
            ? -Number(entry.amount)
            : 0;
      }
      if (entry.type === AccountingEntryType.TRANSFER && entry.counterAccountId === accountId) {
        delta += Number(entry.amount);
      }
      return delta;
    };

    const accountStats = new Map<string, {
      income: number;
      expense: number;
      transferIn: number;
      transferOut: number;
      openingBalance: number;
    }>();
    for (const account of accounts) {
      const openingDelta = priorEntries.reduce((sum, entry) => sum + getAccountDelta(entry, account.id), 0);
      accountStats.set(account.id, {
        income: 0,
        expense: 0,
        transferIn: 0,
        transferOut: 0,
        openingBalance: Number(account.openingBalance || 0) + openingDelta,
      });
    }

    const dailyMap = new Map<string, {
      income: number;
      expense: number;
      transferIn: number;
      transferOut: number;
    }>();
    const incomeCategoryMap = new Map<string, number>();
    const expenseCategoryMap = new Map<string, number>();
    let totalIncome = 0;
    let totalExpense = 0;
    let totalTransfer = 0;

    for (const entry of entries) {
      const amount = Number(entry.amount || 0);
      if (entry.type === AccountingEntryType.INCOME) totalIncome += amount;
      if (entry.type === AccountingEntryType.EXPENSE) totalExpense += amount;
      if (entry.type === AccountingEntryType.TRANSFER) totalTransfer += amount;

      const day = dailyMap.get(entry.date) || { income: 0, expense: 0, transferIn: 0, transferOut: 0 };
      if (entry.type === AccountingEntryType.INCOME) {
        day.income += amount;
        incomeCategoryMap.set(entry.category || 'Kategorisiz', (incomeCategoryMap.get(entry.category || 'Kategorisiz') || 0) + amount);
      } else if (entry.type === AccountingEntryType.EXPENSE) {
        day.expense += amount;
        expenseCategoryMap.set(entry.category || 'Kategorisiz', (expenseCategoryMap.get(entry.category || 'Kategorisiz') || 0) + amount);
      } else if (entry.type === AccountingEntryType.TRANSFER) {
        day.transferOut += amount;
        totalTransfer += 0;
      }
      dailyMap.set(entry.date, day);

      if (entry.accountId) {
        const stat = accountStats.get(entry.accountId);
        if (stat) {
          if (entry.type === AccountingEntryType.INCOME) stat.income += amount;
          if (entry.type === AccountingEntryType.EXPENSE) stat.expense += amount;
          if (entry.type === AccountingEntryType.TRANSFER) stat.transferOut += amount;
        }
      }
      if (entry.type === AccountingEntryType.TRANSFER && entry.counterAccountId) {
        const counterStat = accountStats.get(entry.counterAccountId);
        if (counterStat) counterStat.transferIn += amount;
      }
    }

    for (const entry of entries.filter((item) => item.type === AccountingEntryType.TRANSFER && item.counterAccountId)) {
      const day = dailyMap.get(entry.date);
      if (day) day.transferIn += Number(entry.amount || 0);
    }

    const currency = filters.currency || 'TRY';
    const accountBalances = accounts
      .filter((account) => !filters.currency || account.currency === filters.currency)
      .map((account) => {
        const stat = accountStats.get(account.id) || { income: 0, expense: 0, transferIn: 0, transferOut: 0, openingBalance: Number(account.openingBalance || 0) };
        return {
          id: account.id,
          name: account.name,
          type: account.type,
          currency: account.currency,
          openingBalance: this.money(stat.openingBalance),
          income: this.money(stat.income),
          expense: this.money(stat.expense),
          transferIn: this.money(stat.transferIn),
          transferOut: this.money(stat.transferOut),
          closingBalance: this.money(stat.openingBalance + stat.income - stat.expense + stat.transferIn - stat.transferOut),
        };
      });

    const toCategoryRows = (categoryMap: Map<string, number>) => [...categoryMap.entries()]
      .map(([category, amount]) => ({ category, amount: this.money(amount) }))
      .sort((left, right) => right.amount - left.amount);

    const filteredRents = pendingRents.filter((rent) => (!filters.currency || rent.currency === filters.currency) && (!filters.to || rent.dueDate <= filters.to));
    const filteredCommissions = pendingCommissions.filter((commission) => (!filters.currency || commission.currency === filters.currency) && (!filters.to || commission.date <= filters.to));
    const uncollectedCommissions = filteredCommissions.filter((commission) => commission.status === AccountingCommissionStatus.PENDING);
    const collectedUnpaidCommissions = filteredCommissions.filter((commission) => commission.status === AccountingCommissionStatus.COLLECTED);
    return {
      period: { from: filters.from || null, to: filters.to || null, currency },
      summary: {
        totalIncome: this.money(totalIncome),
        totalExpense: this.money(totalExpense),
        netOperatingResult: this.money(totalIncome - totalExpense),
        totalInternalTransfer: this.money(totalTransfer),
        entryCount: entries.length,
      },
      accountBalances,
      dailyCashFlow: [...dailyMap.entries()].map(([date, day]) => ({
        date,
        income: this.money(day.income),
        expense: this.money(day.expense),
        transferIn: this.money(day.transferIn),
        transferOut: this.money(day.transferOut),
        netOperating: this.money(day.income - day.expense),
      })),
      incomeByCategory: toCategoryRows(incomeCategoryMap),
      expenseByCategory: toCategoryRows(expenseCategoryMap),
      pending: {
        rentReceivable: this.money(filteredRents.reduce((sum, rent) => sum + Number(rent.amount || 0), 0)),
        rentCount: filteredRents.length,
        commissionCollection: this.money(uncollectedCommissions.reduce((sum, commission) => sum + Number(commission.grossAmount || 0), 0)),
        commissionCollectionCount: uncollectedCommissions.length,
        commissionPayable: this.money(collectedUnpaidCommissions.reduce((sum, commission) => sum + Number(commission.agentGrossShare || 0), 0)),
        commissionPayableCount: collectedUnpaidCommissions.length,
        commissionCount: filteredCommissions.length,
      },
    };
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
