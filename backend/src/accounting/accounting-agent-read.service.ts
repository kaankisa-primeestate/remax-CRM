import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { AccountingAccount } from './accounting-account.entity';
import {
  AccountingCommission,
  AccountingCommissionStatus,
} from './accounting-commission.entity';
import {
  AccountingEntry,
  AccountingEntryType,
  AccountingPartyType,
} from './accounting-entry.entity';
import {
  AccountingParty,
  AccountingPartyBalanceDirection,
} from './accounting-party.entity';
import { AccountingRent, AccountingRentStatus } from './accounting-rent.entity';

export type AgentStatementCategory =
  | 'commission'
  | 'commission_payment'
  | 'agent_due'
  | 'expense_chargeback'
  | 'manual';

export interface AccountingAgentStatementEntry {
  id: string;
  date: string;
  category: AgentStatementCategory;
  label: string;
  debit: number;
  credit: number;
  runningBalance: number;
}

export interface AccountingAgentStatementSummary {
  totalCredit: number;
  totalDeductions: number;
  totalPayments: number;
  netBalance: number;
  entryCount: number;
}

export interface AccountingAgentStatement {
  entries: AccountingAgentStatementEntry[];
  summary: AccountingAgentStatementSummary;
}

type RawStatementEntry = Omit<AccountingAgentStatementEntry, 'runningBalance'> & {
  sequence: number;
  excludeFromSummary?: boolean;
};

const AUTO_SOURCE_TYPES = new Set([
  'accounting_commission_collection',
  'accounting_commission_payment',
  'accounting_rent_collection',
]);

@Injectable()
export class AccountingAgentReadService {
  constructor(
    @InjectRepository(AccountingCommission)
    private readonly commissionRepo: Repository<AccountingCommission>,
    @InjectRepository(AccountingRent)
    private readonly rentRepo: Repository<AccountingRent>,
    @InjectRepository(AccountingEntry)
    private readonly entryRepo: Repository<AccountingEntry>,
    @InjectRepository(AccountingParty)
    private readonly partyRepo: Repository<AccountingParty>,
    @InjectRepository(AccountingAccount)
    private readonly accountRepo: Repository<AccountingAccount>,
  ) {}

  async listCommissions(
    agentId: string,
    filters: { status?: string; fromDate?: string; toDate?: string } = {},
  ) {
    const commissions = await this.commissionRepo.find({
      where: { agentId, currency: 'TRY', voidedAt: IsNull() },
      order: { date: 'DESC', createdAt: 'DESC' },
    });
    const visible = commissions.filter((commission) => {
      const status = this.toLegacyCommissionStatus(commission.status);
      if (!status || commission.voidedAt) return false;
      if (filters.status && status !== filters.status) return false;
      if (filters.fromDate && commission.date < filters.fromDate) return false;
      if (filters.toDate && commission.date > filters.toDate) return false;
      return true;
    });
    const accountMap = await this.getAccountMap(
      visible.flatMap((commission) => [commission.paymentAccountId, commission.collectionAccountId]),
    );
    return visible.map((commission) => this.toLegacyCommission(commission, accountMap));
  }

  async findCommission(agentId: string, id: string) {
    const commission = await this.commissionRepo.findOne({
      where: { id, agentId, currency: 'TRY', voidedAt: IsNull() },
    });
    if (!commission || !this.toLegacyCommissionStatus(commission.status)) return null;
    const accountMap = await this.getAccountMap([
      commission.paymentAccountId,
      commission.collectionAccountId,
    ]);
    return this.toLegacyCommission(commission, accountMap);
  }

  async summarizeCommissions(
    agentId: string,
    filters: { status?: string; fromDate?: string; toDate?: string } = {},
  ) {
    const commissions = await this.listCommissions(agentId, filters);
    const totalGross = commissions.reduce((sum, item) => sum + Number(item.grossCommission), 0);
    const totalNetPayable = commissions.reduce((sum, item) => sum + Number(item.netPayable), 0);
    const totalPaid = commissions
      .filter((item) => item.status === 'paid')
      .reduce((sum, item) => sum + Number(item.netPayable), 0);
    return {
      count: commissions.length,
      totalGross: this.money(totalGross),
      totalNetPayable: this.money(totalNetPayable),
      totalPaid: this.money(totalPaid),
      totalPending: this.money(totalNetPayable - totalPaid),
    };
  }

  async listCommissionPayments(agentId: string, commissionId: string) {
    const commission = await this.commissionRepo.findOne({
      where: {
        id: commissionId,
        agentId,
        currency: 'TRY',
        status: AccountingCommissionStatus.PAID,
        voidedAt: IsNull(),
      },
    });
    if (!commission) return null;
    const accountMap = await this.getAccountMap([commission.paymentAccountId]);
    const account = commission.paymentAccountId
      ? accountMap.get(commission.paymentAccountId)
      : null;
    return [{
      id: `accounting-payment-${commission.id}`,
      commissionId: commission.id,
      amount: this.money(commission.agentGrossShare),
      date: commission.paidAt || commission.date,
      bankAccountId: commission.paymentAccountId,
      accountName: account?.name || null,
      bankName: account?.bankName || null,
      paymentMethod: 'account',
      notes: commission.notes,
      createdAt: commission.updatedAt || commission.createdAt,
    }];
  }

  async listRents(agentId: string) {
    const rents = await this.rentRepo.find({
      where: { agentId, currency: 'TRY', voidedAt: IsNull() },
      order: { period: 'DESC', createdAt: 'DESC' },
    });
    return rents
      .filter((rent) => rent.status !== AccountingRentStatus.VOIDED && !rent.voidedAt)
      .map((rent) => ({
        id: rent.id,
        agentId: rent.agentId,
        period: rent.period,
        expectedAmount: this.money(rent.amount),
        paid: rent.status === AccountingRentStatus.COLLECTED,
        paidDate: rent.status === AccountingRentStatus.COLLECTED ? rent.collectedAt : null,
        bankAccountId: rent.collectionAccountId,
        notes: rent.notes,
        createdAt: rent.createdAt,
        updatedAt: rent.updatedAt,
      }));
  }

  async getBalance(agentId: string) {
    const statement = await this.getStatement(agentId);
    return statement.summary.netBalance;
  }

  async getHistory(agentId: string) {
    const statement = await this.getStatement(agentId);
    return [...statement.entries]
      .reverse()
      .map((entry) => ({
        id: entry.id,
        type: entry.category === 'commission'
          ? 'accrual'
          : entry.category === 'commission_payment'
            ? 'payment'
            : entry.category === 'agent_due'
              ? 'due'
              : 'adjustment',
        label: entry.label,
        amount: this.money(entry.credit || entry.debit),
        direction: entry.credit > 0 ? 'credit' : 'debit',
        date: entry.date,
      }));
  }

  async getStatement(
    agentId: string,
    fromDate?: string,
    toDate?: string,
  ): Promise<AccountingAgentStatement> {
    const party = await this.partyRepo.findOne({
      where: { linkedUserId: agentId, type: AccountingPartyType.AGENT },
    });
    const partyIds = Array.from(new Set([agentId, party?.id].filter(Boolean))) as string[];
    const [commissions, rents, entries] = await Promise.all([
      this.commissionRepo.find({
        where: { agentId, currency: 'TRY', voidedAt: IsNull() },
        order: { date: 'ASC', createdAt: 'ASC' },
      }),
      this.rentRepo.find({
        where: { agentId, currency: 'TRY', voidedAt: IsNull() },
        order: { dueDate: 'ASC', createdAt: 'ASC' },
      }),
      this.entryRepo.find({
        where: {
          partyType: AccountingPartyType.AGENT,
          partyId: In(partyIds),
          currency: 'TRY',
          voidedAt: IsNull(),
        },
        order: { date: 'ASC', createdAt: 'ASC' },
      }),
    ]);

    const accountMap = await this.getAccountMap([
      ...commissions.flatMap((commission) => [commission.collectionAccountId, commission.paymentAccountId]),
      ...rents.map((rent) => rent.collectionAccountId),
      ...entries.flatMap((entry) => [entry.accountId, entry.counterAccountId]),
    ]);
    const withAccount = (label: string, accountId: string | null | undefined) => {
      const accountName = accountId ? accountMap.get(accountId)?.name : null;
      return accountName ? `${label} · Hesap: ${accountName}` : label;
    };

    const raw: RawStatementEntry[] = [];
    const openingAmount = Number(party?.openingBalance || 0);
    if (party && openingAmount > 0) {
      const officeOwesAgent = party.openingBalanceDirection === AccountingPartyBalanceDirection.PAYABLE;
      raw.push({
        id: `accounting-opening-${party.id}`,
        date: party.createdAt ? new Date(party.createdAt).toISOString().slice(0, 10) : '1970-01-01',
        category: 'manual',
        label: officeOwesAgent
          ? 'Açılış bakiyesi — ofisin danışmana borcu'
          : 'Açılış bakiyesi — danışmanın ofise borcu',
        debit: officeOwesAgent ? 0 : this.money(openingAmount),
        credit: officeOwesAgent ? this.money(openingAmount) : 0,
        sequence: 0,
        excludeFromSummary: true,
      });
    }

    for (const commission of commissions) {
      if (
        commission.voidedAt
        || commission.status === AccountingCommissionStatus.PENDING
        || commission.status === AccountingCommissionStatus.VOIDED
      ) {
        continue;
      }
      raw.push({
        id: `accounting-commission-${commission.id}`,
        date: commission.date,
        category: 'commission',
        label: `Komisyon hakedişi: ${commission.propertyTitle || 'Portföy'} (Toplam: ${Number(commission.grossAmount).toLocaleString('tr-TR')} ₺ · Pay: %${Number(commission.agentSharePercent).toLocaleString('tr-TR')})`,
        debit: 0,
        credit: this.money(commission.agentGrossShare),
        sequence: 10,
      });
      if (commission.status === AccountingCommissionStatus.PAID) {
        raw.push({
          id: `accounting-commission-payment-${commission.id}`,
          date: commission.paidAt || commission.date,
          category: 'commission_payment',
          label: withAccount('Ofis ödemesi yapıldı', commission.paymentAccountId),
          debit: this.money(commission.agentGrossShare),
          credit: 0,
          sequence: 30,
        });
      }
    }

    for (const rent of rents) {
      if (rent.voidedAt || rent.status === AccountingRentStatus.VOIDED) continue;
      raw.push({
        id: `accounting-rent-${rent.id}`,
        date: rent.dueDate,
        category: 'agent_due',
        label: `Aylık Ofis Aidatı (${rent.period})${rent.status === AccountingRentStatus.COLLECTED ? ' — ödendi' : ''}`,
        debit: this.money(rent.amount),
        credit: 0,
        sequence: 10,
      });
      if (rent.status === AccountingRentStatus.COLLECTED) {
        raw.push({
          id: `accounting-rent-payment-${rent.id}`,
          date: rent.collectedAt || rent.dueDate,
          category: 'agent_due',
          label: withAccount(`Aylık Ofis Aidatı Ödemesi (${rent.period})`, rent.collectionAccountId),
          debit: 0,
          credit: this.money(rent.amount),
          sequence: 30,
        });
      }
    }

    for (const entry of entries) {
      if (
        entry.voidedAt
        || entry.type === AccountingEntryType.TRANSFER
        || (entry.sourceType && AUTO_SOURCE_TYPES.has(entry.sourceType))
      ) {
        continue;
      }
      const amount = this.money(entry.amount);
      const category = this.statementCategory(entry);
      raw.push({
        id: `accounting-entry-${entry.id}`,
        date: entry.date,
        category,
        label: withAccount(entry.description?.trim() || entry.category, entry.accountId),
        debit: entry.type === AccountingEntryType.EXPENSE ? amount : 0,
        credit: entry.type === AccountingEntryType.INCOME ? amount : 0,
        sequence: 20,
      });
    }

    raw.sort((left, right) => {
      const dateCompare = left.date.localeCompare(right.date);
      if (dateCompare !== 0) return dateCompare;
      if (left.sequence !== right.sequence) return left.sequence - right.sequence;
      return left.id.localeCompare(right.id);
    });

    let runningBalance = 0;
    const visible: Array<AccountingAgentStatementEntry & { excludeFromSummary?: boolean }> = [];
    for (const entry of raw) {
      if (toDate && entry.date > toDate) continue;
      runningBalance = this.money(runningBalance + entry.credit - entry.debit);
      if (fromDate && entry.date < fromDate) continue;
      const { sequence: _sequence, ...statementEntry } = entry;
      visible.push({ ...statementEntry, runningBalance });
    }

    const entriesForResponse: AccountingAgentStatementEntry[] = visible.map(({ excludeFromSummary: _exclude, ...entry }) => entry);
    const summaryEntries = visible.filter((entry) => !entry.excludeFromSummary);
    const totalCredit = summaryEntries
      .filter((entry) => entry.category === 'commission' || (entry.category === 'manual' && entry.credit > 0))
      .reduce((sum, entry) => sum + entry.credit, 0);
    const totalDeductions = summaryEntries
      .filter((entry) => entry.category === 'agent_due' || entry.category === 'expense_chargeback' || (entry.category === 'manual' && entry.debit > 0))
      .reduce((sum, entry) => sum + entry.debit, 0);
    const totalPayments = summaryEntries
      .filter((entry) => entry.category === 'commission_payment')
      .reduce((sum, entry) => sum + entry.debit, 0);

    return {
      entries: entriesForResponse,
      summary: {
        totalCredit: this.money(totalCredit),
        totalDeductions: this.money(totalDeductions),
        totalPayments: this.money(totalPayments),
        netBalance: this.money(runningBalance),
        entryCount: entriesForResponse.length,
      },
    };
  }

  private statementCategory(entry: AccountingEntry): AgentStatementCategory {
    const text = `${entry.category || ''} ${entry.description || ''}`.toLocaleLowerCase('tr-TR');
    if (text.includes('masraf') || text.includes('yansıt')) return 'expense_chargeback';
    return 'manual';
  }

  private toLegacyCommissionStatus(status: AccountingCommissionStatus) {
    if (status === AccountingCommissionStatus.PENDING) return 'pending';
    if (status === AccountingCommissionStatus.COLLECTED) return 'approved';
    if (status === AccountingCommissionStatus.PAID) return 'paid';
    return null;
  }

  private toLegacyCommission(
    commission: AccountingCommission,
    accountMap: Map<string, AccountingAccount>,
  ) {
    const accountId = commission.paymentAccountId || commission.collectionAccountId;
    const account = accountId ? accountMap.get(accountId) : null;
    return {
      id: commission.id,
      propertyId: null,
      customerId: null,
      transactionId: null,
      collaboratorAgentId: null,
      collaboratorSplitPercent: null,
      agentId: commission.agentId,
      transactionType: commission.transactionType,
      propertyTitle: commission.propertyTitle,
      transactionAmount: this.money(commission.grossAmount),
      commissionRate: 100,
      grossCommission: this.money(commission.grossAmount),
      agentSharePercent: Number(commission.agentSharePercent),
      agentGrossShare: this.money(commission.agentGrossShare),
      withholdingTaxPercent: 0,
      vatPercent: 0,
      penaltyAmount: 0,
      netPayable: this.money(commission.agentGrossShare),
      dueDate: commission.date,
      status: this.toLegacyCommissionStatus(commission.status),
      statusChangedAt: commission.paidAt || commission.collectedAt || commission.updatedAt,
      notes: commission.notes,
      accountName: account?.name || null,
      bankName: account?.bankName || null,
      currency: commission.currency,
      collectionAccountId: commission.collectionAccountId,
      paymentAccountId: commission.paymentAccountId,
      createdAt: commission.createdAt,
      updatedAt: commission.updatedAt,
    };
  }

  private async getAccountMap(ids: Array<string | null | undefined>) {
    const uniqueIds = Array.from(new Set(ids.filter(Boolean))) as string[];
    if (uniqueIds.length === 0) return new Map<string, AccountingAccount>();
    const accounts = await this.accountRepo.find({ where: { id: In(uniqueIds) } });
    return new Map(accounts.map((account) => [account.id, account]));
  }

  private money(value: number | string | null | undefined) {
    return Math.round((Number(value) || 0) * 100) / 100;
  }
}
