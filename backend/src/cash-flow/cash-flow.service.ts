import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChequeNote, ChequeNoteStatus, ChequeNoteDirection } from '../cheque-notes/cheque-note.entity';
import { AccountingCommission, AccountingCommissionStatus } from '../accounting/accounting-commission.entity';
import { AccountingRent, AccountingRentStatus } from '../accounting/accounting-rent.entity';
import { RecurringExpensesService } from '../recurring-expenses/recurring-expenses.service';

export interface CashFlowItem {
  source: 'cheque_note' | 'commission_in' | 'commission_out' | 'agent_due' | 'recurring_expense';
  label: string;
  amount: number;
  date: string; // YYYY-MM-DD
}

export interface CashFlowForecast {
  periodDays: number;
  fromDate: string;
  toDate: string;
  inflows: CashFlowItem[];
  outflows: CashFlowItem[];
  totalInflow: number;
  totalOutflow: number;
  netProjection: number;
  assumptions: string[];
}

const FORECAST_DAYS = 30;

// Nakit Akis Projeksiyonu: onumuzdeki 30 gunluk donemde beklenen tum
// para hareketlerini TEK bir tabloda birlestirir. ONEMLI: bu bir KESIN
// tahmin degil, mevcut kayitlardan turetilen KABA bir projeksiyondur --
// asagidaki varsayimlar (assumptions) kullaniciya acikca gosterilmelidir
// (bkz. frontend), aksi halde yanlis bir kesinlik hissi verebilir.
@Injectable()
export class CashFlowService {
  constructor(
    @InjectRepository(ChequeNote) private readonly chequeNoteRepo: Repository<ChequeNote>,
    @InjectRepository(AccountingCommission) private readonly commissionRepo: Repository<AccountingCommission>,
    @InjectRepository(AccountingRent) private readonly agentDueRepo: Repository<AccountingRent>,
    private readonly recurringExpensesService: RecurringExpensesService,
  ) {}

  async getForecast(): Promise<CashFlowForecast> {
    const today = new Date();
    const fromDate = today.toISOString().slice(0, 10);
    const toDateObj = new Date(today);
    toDateObj.setDate(toDateObj.getDate() + FORECAST_DAYS);
    const toDate = toDateObj.toISOString().slice(0, 10);

    const inflows: CashFlowItem[] = [];
    const outflows: CashFlowItem[] = [];

    // --- 1. Cek/Senet: vadesi bu 30 gun icinde olan, hala "portfoyde
    // bekleyen" (henuz tahsil/odenmemis) kayitlar ---
    const cheques = await this.chequeNoteRepo
      .createQueryBuilder('c')
      .where('c.status = :status', { status: ChequeNoteStatus.PORTFOLIO })
      .andWhere('c.dueDate BETWEEN :from AND :to', { from: fromDate, to: toDate })
      .getMany();
    for (const c of cheques) {
      const item: CashFlowItem = {
        source: 'cheque_note',
        label: `${c.type === 'cheque' ? 'Çek' : 'Senet'}: ${c.drawerName}`,
        amount: Number(c.amount),
        date: c.dueDate,
      };
      if (c.direction === ChequeNoteDirection.RECEIVABLE) inflows.push(item);
      else outflows.push(item);
    }

    // --- 2. Komisyonlar: henuz tahsil edilmemis (pending_collection),
    // vadesi bu 30 gun icinde olanlar. VARSAYIM: brut komisyonun
    // TAMAMI (musteriden/bankadan) vade gununde tahsil edilir (Girdi),
    // danismana odenecek pay da AYNI gunde cikar (Cikti) -- gercekte
    // birkac gun gecikebilir, bu basitlestirilmis bir varsayimdir. ---
    const pendingCommissions = await this.commissionRepo
      .createQueryBuilder('c')
      .where('c.status = :status', { status: AccountingCommissionStatus.PENDING })
      .andWhere('c.date BETWEEN :from AND :to', { from: fromDate, to: toDate })
      .getMany();
    for (const c of pendingCommissions) {
      const label = c.propertyTitle || 'Komisyon';
      inflows.push({ source: 'commission_in', label: `Komisyon tahsilatı: ${label}`, amount: Number(c.grossAmount), date: c.date });
      outflows.push({ source: 'commission_out', label: `Danışman hakedişi: ${label}`, amount: Number(c.agentGrossShare), date: c.date });
    }

    // --- 3. Danisman Aidatlari: tahsil edilmemis, bu ay VEYA gelecek ay
    // icin olan kayitlar. VARSAYIM: vade tarihi net tutulmadigi icin
    // (sadece 'YYYY-MM' donemi var), her donemin 5. gunu vade kabul edilir. ---
    const periodThis = fromDate.slice(0, 7);
    const nextMonthDate = new Date(today);
    nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
    const periodNext = nextMonthDate.toISOString().slice(0, 7);
    const unpaidDues = await this.agentDueRepo
      .createQueryBuilder('d')
      .where('d.status = :status', { status: AccountingRentStatus.PENDING })
      .andWhere('d.period IN (:...periods)', { periods: [periodThis, periodNext] })
      .getMany();
    for (const due of unpaidDues) {
      const approxDate = `${due.period}-05`;
      if (approxDate >= fromDate && approxDate <= toDate) {
        inflows.push({ source: 'agent_due', label: `Danışman aidatı (${due.period})`, amount: Number(due.amount), date: approxDate });
      }
    }

    // --- 4. Sabit Giderler: bu ay VE gelecek ay icin henuz odenmemis
    // sablonlar (RecurringExpensesService uzerinden, cift mantik yazmamak icin) ---
    const [pendingThis, pendingNext] = await Promise.all([
      this.recurringExpensesService.getPendingForPeriod(periodThis),
      this.recurringExpensesService.getPendingForPeriod(periodNext),
    ]);
    for (const p of [...pendingThis, ...pendingNext]) {
      if (p.dueDate >= fromDate && p.dueDate <= toDate) {
        outflows.push({ source: 'recurring_expense', label: p.template.title, amount: Number(p.template.defaultAmount), date: p.dueDate });
      }
    }

    inflows.sort((a, b) => a.date.localeCompare(b.date));
    outflows.sort((a, b) => a.date.localeCompare(b.date));

    const totalInflow = inflows.reduce((sum, i) => sum + i.amount, 0);
    const totalOutflow = outflows.reduce((sum, i) => sum + i.amount, 0);

    return {
      periodDays: FORECAST_DAYS,
      fromDate,
      toDate,
      inflows,
      outflows,
      totalInflow,
      totalOutflow,
      netProjection: totalInflow - totalOutflow,
      assumptions: [
        'Bu bir kesin tahmin değil, mevcut kayıtlardan türetilen kaba bir projeksiyondur.',
        'Komisyonlarda: brüt tutarın vade gününde tahsil edildiği, danışman payının da aynı gün ödendiği varsayılır (gerçekte birkaç gün fark olabilir).',
        'Danışman aidatlarında: kesin bir vade tarihi tutulmadığı için, ilgili ayın 5. günü vade kabul edilir.',
        'Zaten gerçekleşmiş (geçmiş) gider/gelir kayıtları bu projeksiyona dahil değildir — sadece BEKLEYEN/GELECEK hareketler gösterilir.',
      ],
    };
  }
}
