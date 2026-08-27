import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import {
  AccountingAccount,
  AccountingAccountType,
} from './accounting-account.entity';
import {
  AccountingCommission,
  AccountingCommissionStatus,
} from './accounting-commission.entity';
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
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async listAccounts() {
    const [accounts, entries] = await Promise.all([
      this.accountRepo.find({ order: { isActive: 'DESC', createdAt: 'ASC' } }),
      this.entryRepo.find({ where: { voidedAt: IsNull() } }),
    ]);

    return accounts.map((account) => ({
      ...account,
      currentBalance: this.calculateBalance(account, entries),
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
    const entries = await this.entryRepo.find({
      where: { voidedAt: IsNull() },
      order: { date: 'DESC', createdAt: 'DESC' },
    });
    const accounts = await this.accountRepo.find();
    const accountMap = new Map(accounts.map((account) => [account.id, account]));

    return entries
      .filter((entry) => !filters.from || entry.date >= filters.from)
      .filter((entry) => !filters.to || entry.date <= filters.to)
      .filter((entry) => !filters.currency || entry.currency === filters.currency)
      .filter((entry) => !filters.type || entry.type === filters.type)
      .map((entry) => ({
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

  async createCommission(dto: CreateAccountingCommissionDto, createdBy: string) {
    this.assertCurrency(dto.currency);
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
      createdBy,
    });

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
    const entries = await this.listEntries(filters);
    const income = entries
      .filter((entry) => entry.type === AccountingEntryType.INCOME)
      .reduce((sum, entry) => sum + Number(entry.amount), 0);
    const expense = entries
      .filter((entry) => entry.type === AccountingEntryType.EXPENSE)
      .reduce((sum, entry) => sum + Number(entry.amount), 0);

    return {
      currency: filters.currency || 'ALL',
      totalIncome: income,
      totalExpense: expense,
      netOperatingResult: income - expense,
      entryCount: entries.length,
    };
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

  private calculateBalance(account: AccountingAccount, entries: AccountingEntry[]) {
    return entries.reduce((balance, entry) => {
      if (entry.currency !== account.currency) return balance;
      const amount = Number(entry.amount);

      if (entry.type === AccountingEntryType.INCOME && entry.accountId === account.id) {
        return balance + amount;
      }
      if (entry.type === AccountingEntryType.EXPENSE && entry.accountId === account.id) {
        return balance - amount;
      }
      if (entry.type === AccountingEntryType.TRANSFER) {
        if (entry.accountId === account.id) return balance - amount;
        if (entry.counterAccountId === account.id) return balance + amount;
      }
      return balance;
    }, Number(account.openingBalance || 0));
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
