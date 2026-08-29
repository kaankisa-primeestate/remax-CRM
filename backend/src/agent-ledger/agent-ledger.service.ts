import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import * as path from 'path';
import PDFDocument = require('pdfkit');
import { Commission } from '../commissions/commission.entity';
import { CommissionPayment } from '../commissions/commission-payment.entity';
import { AgentLedgerAdjustment, LedgerAdjustmentType } from './agent-ledger-adjustment.entity';
import { BankTransaction, BankTransactionType } from '../bank-accounts/bank-transaction.entity';
import { AgentDue } from '../agent-dues/agent-due.entity';
import { User } from '../users/user.entity';
import { CreateAdjustmentDto } from './dto/create-adjustment.dto';
import { CurrentUserPayload } from '../auth/current-user.decorator';
import { AccountingAgentReadService } from '../accounting/accounting-agent-read.service';

export interface StatementEntry {
  date: string;
  category: 'commission' | 'commission_payment' | 'agent_due' | 'expense_chargeback' | 'manual';
  label: string;
  debit: number;
  credit: number;
  runningBalance: number;
}

export interface StatementSummary {
  totalCredit: number; // Toplam Hakediş
  totalDeductions: number; // Toplam Kesinti/Avans (odeme haric)
  totalPayments: number; // Yapilan Odeme
  netBalance: number;
  entryCount: number;
}

// Danisman Cari Hesabi: "Ofis danismana ne kadar borclu?" sorusunun
// cevabini, hicbir yerde SAKLAMADAN, her zaman canli hesaplar:
//
//   bakiye = SUM(onaylanmis/odenmis komisyonlarin netPayable'i)
//          - SUM(o komisyonlara yapilan tum odemeler)
//          + SUM(manuel 'credit' kayitlari)
//          - SUM(manuel 'debit' kayitlari)
//
// Pozitif bakiye = ofis danismana borclu. Negatif bakiye = danisman
// ofise borclu (orn. fazla avans almis).
@Injectable()
export class AgentLedgerService {
  constructor(
    @InjectRepository(Commission) private readonly commissionRepo: Repository<Commission>,
    @InjectRepository(CommissionPayment) private readonly paymentRepo: Repository<CommissionPayment>,
    @InjectRepository(AgentLedgerAdjustment) private readonly adjustmentRepo: Repository<AgentLedgerAdjustment>,
    @InjectRepository(BankTransaction) private readonly bankTransactionRepo: Repository<BankTransaction>,
    @InjectRepository(AgentDue) private readonly agentDueRepo: Repository<AgentDue>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly accountingAgentReadService: AccountingAgentReadService,
  ) {}

  private assertAccess(agentId: string, currentUser: CurrentUserPayload) {
    if (currentUser.role === 'agent' && currentUser.userId !== agentId) {
      throw new ForbiddenException('Bu cari hesaba erişim yetkiniz yok');
    }
  }

  async getBalance(agentId: string, currentUser: CurrentUserPayload): Promise<number> {
    this.assertAccess(agentId, currentUser);
    if (currentUser.role === 'agent') {
      return this.accountingAgentReadService.getBalance(agentId);
    }
    const commissions = await this.commissionRepo.find({
      where: { agentId, status: In(['approved', 'paid']) as any },
    });
    const commissionIds = commissions.map((c) => c.id);
    const payments = commissionIds.length
      ? await this.paymentRepo.find({ where: { commissionId: In(commissionIds) } })
      : [];
    const adjustments = await this.adjustmentRepo.find({ where: { agentId } });
    const dues = await this.agentDueRepo.find({ where: { agentId } });

    const totalOwed = commissions.reduce((sum, c) => sum + Number(c.netPayable), 0);
    const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const totalCredit = adjustments
      .filter((a) => a.type === LedgerAdjustmentType.CREDIT)
      .reduce((sum, a) => sum + Number(a.amount), 0);
    const totalDebit = adjustments
      .filter((a) => a.type === LedgerAdjustmentType.DEBIT)
      .reduce((sum, a) => sum + Number(a.amount), 0);
    // Aidatlar odenmis olsun olmasin, tahakkuk ettigi an danismanin
    // borcu sayilir (Komisyon netPayable'in "onaylaninca hemen alacak
    // sayilmasi" ile simetrik bir mantik) -- "odendi" isareti sadece
    // Broker'in kendi takibi icin, bakiyeyi ikinci kez etkilemez.
    const totalDues = dues.reduce((sum, d) => sum + Number(d.expectedAmount), 0);

    return totalOwed - totalPaid + totalCredit - totalDebit - totalDues;
  }

  // Broker icin: tum danismanlarin bakiyelerini tek seferde dondurur.
  async getSummaryForAgents(agentIds: string[]): Promise<Record<string, number>> {
    const result: Record<string, number> = {};
    for (const agentId of agentIds) {
      result[agentId] = await this.getBalance(agentId, { role: 'broker', userId: '' } as CurrentUserPayload);
    }
    return result;
  }

  // Tum hareketleri (komisyon tahakkuklari + odemeler + manuel kayitlar)
  // tek bir kronolojik listede birlestirir -- danismanin/Broker'in
  // "ekstre" gibi okuyabilecegi bir gorunum.
  async getHistory(agentId: string, currentUser: CurrentUserPayload): Promise<any[]> {
    this.assertAccess(agentId, currentUser);
    if (currentUser.role === 'agent') {
      return this.accountingAgentReadService.getHistory(agentId);
    }
    const commissions = await this.commissionRepo.find({
      where: { agentId, status: In(['approved', 'paid']) as any },
    });
    const commissionIds = commissions.map((c) => c.id);
    const payments = commissionIds.length
      ? await this.paymentRepo.find({ where: { commissionId: In(commissionIds) } })
      : [];
    const adjustments = await this.adjustmentRepo.find({ where: { agentId } });

    const items = [
      ...commissions.map((c) => ({
        id: `commission-${c.id}`,
        type: 'accrual',
        label: `Komisyon tahakkuku: ${c.propertyTitle || 'Portföy'}`,
        amount: Number(c.netPayable),
        direction: 'credit',
        date: c.statusChangedAt || c.dueDate,
      })),
      ...payments.map((p) => ({
        id: `payment-${p.id}`,
        type: 'payment',
        label: 'Komisyon ödemesi yapıldı',
        amount: Number(p.amount),
        direction: 'debit',
        date: p.date,
      })),
      ...adjustments.map((a) => ({
        id: `adjustment-${a.id}`,
        type: 'adjustment',
        label: a.description,
        amount: Number(a.amount),
        direction: a.type,
        date: a.date,
      })),
    ];

    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  // --- Bireysel Cari Ekstre (Statement) ---
  // getHistory'den farki: kronolojik (eskiden yeniye) sirali, her satirda
  // YURUYEN BAKIYE (running balance) hesaplanmis, kategorize edilmis
  // (komisyon/odeme/aidat/masraf yansitmasi/manuel) ve ozet toplamlar
  // iceren TAM bir ekstre gorunumudur -- "Danisman Ekstre Panosu" icin.
  async getStatement(
    agentId: string,
    currentUser: CurrentUserPayload,
    fromDate?: string,
    toDate?: string,
  ): Promise<{ entries: StatementEntry[]; summary: StatementSummary }> {
    this.assertAccess(agentId, currentUser);
    if (currentUser.role === 'agent') {
      return this.accountingAgentReadService.getStatement(agentId, fromDate, toDate);
    }

    const commissions = await this.commissionRepo.find({
      where: { agentId, status: In(['approved', 'paid']) as any },
    });
    const commissionIds = commissions.map((c) => c.id);
    const payments = commissionIds.length
      ? await this.paymentRepo.find({ where: { commissionId: In(commissionIds) } })
      : [];
    const adjustments = await this.adjustmentRepo.find({ where: { agentId } });
    const dues = await this.agentDueRepo.find({ where: { agentId } });

    type RawEntry = { date: string; category: StatementEntry['category']; label: string; debit: number; credit: number };
    const raw: RawEntry[] = [
      ...commissions.map((c) => ({
        date: (c.statusChangedAt ? new Date(c.statusChangedAt).toISOString() : c.dueDate).slice(0, 10),
        category: 'commission' as const,
        label: `Komisyon hakedişi: ${c.propertyTitle || 'Portföy'} (Toplam: ${Number(c.grossCommission).toLocaleString('tr-TR')} ₺ · Pay: %${c.agentSharePercent})`,
        debit: 0,
        credit: Number(c.netPayable),
      })),
      ...payments.map((p) => ({
        date: p.date,
        category: 'commission_payment' as const,
        label: 'Ofis ödemesi yapıldı',
        debit: Number(p.amount),
        credit: 0,
      })),
      ...adjustments.map((a) => ({
        date: a.date,
        category: (a.source === 'expense' ? 'expense_chargeback' : 'manual') as StatementEntry['category'],
        label: a.description,
        debit: a.type === LedgerAdjustmentType.DEBIT ? Number(a.amount) : 0,
        credit: a.type === LedgerAdjustmentType.CREDIT ? Number(a.amount) : 0,
      })),
      ...dues.map((d) => ({
        date: `${d.period}-01`,
        category: 'agent_due' as const,
        label: `Aylık Ofis Aidatı (${d.period})${d.paid ? ' — ödendi' : ''}`,
        debit: Number(d.expectedAmount),
        credit: 0,
      })),
    ];

    const filtered = raw.filter((e) => (!fromDate || e.date >= fromDate) && (!toDate || e.date <= toDate));
    filtered.sort((a, b) => a.date.localeCompare(b.date));

    let running = 0;
    const entries: StatementEntry[] = filtered.map((e) => {
      running += e.credit - e.debit;
      return { ...e, runningBalance: running };
    });

    const summary: StatementSummary = {
      totalCredit: entries.filter((e) => e.category === 'commission' || (e.category === 'manual' && e.credit > 0)).reduce((s, e) => s + e.credit, 0),
      totalDeductions: entries.filter((e) => e.category === 'agent_due' || e.category === 'expense_chargeback' || (e.category === 'manual' && e.debit > 0)).reduce((s, e) => s + e.debit, 0),
      totalPayments: entries.filter((e) => e.category === 'commission_payment').reduce((s, e) => s + e.debit, 0),
      netBalance: running,
      entryCount: entries.length,
    };

    return { entries, summary };
  }

  async createAdjustment(dto: CreateAdjustmentDto, currentUser: CurrentUserPayload): Promise<AgentLedgerAdjustment> {
    if (currentUser.role !== 'broker') {
      throw new ForbiddenException('Sadece Broker manuel cari hareket ekleyebilir');
    }
    const adjustment = this.adjustmentRepo.create(dto);
    const saved = await this.adjustmentRepo.save(adjustment);

    if (dto.bankAccountId) {
      // 'debit' (avans/ceza -- ofis para veriyor) = banka cikisi
      // 'credit' (danisman ofis adina odedi -- ofis geri odeyecek) =
      //   burada henuz banka hareketi olusmaz, geri odeme yapildiginda olusur.
      if (dto.type === LedgerAdjustmentType.DEBIT) {
        const transaction = this.bankTransactionRepo.create({
          bankAccountId: dto.bankAccountId,
          type: BankTransactionType.WITHDRAWAL,
          amount: dto.amount,
          date: dto.date,
          description: `Cari hareket: ${dto.description}`,
          source: 'agent_ledger_adjustment',
          sourceId: saved.id,
        });
        await this.bankTransactionRepo.save(transaction);
      }
    }

    return saved;
  }

  async removeAdjustment(id: string, currentUser: CurrentUserPayload): Promise<void> {
    if (currentUser.role !== 'broker') {
      throw new ForbiddenException('Sadece Broker manuel cari hareket silebilir');
    }
    const adjustment = await this.adjustmentRepo.findOne({ where: { id } });
    if (!adjustment) {
      throw new NotFoundException('Kayıt bulunamadı');
    }
    await this.bankTransactionRepo.delete({ source: 'agent_ledger_adjustment', sourceId: id });
    await this.adjustmentRepo.remove(adjustment);
  }

  // --- PDF Ekstre Raporu ---
  // Piyasa Degeri Analizi raporuyla AYNI desen (pdfkit + gomulu Roboto
  // fontu -- Turkce karakterler icin pdfkit'in yerlesik Helvetica'si
  // yetersiz kaliyordu). Onceden sadece tarayici yazdirmasi vardi, artik
  // sunucu tarafinda gercek, indirilebilir bir PDF uretiliyor.
  async generateStatementPdf(
    agentId: string,
    currentUser: CurrentUserPayload,
    fromDate?: string,
    toDate?: string,
  ): Promise<Buffer> {
    const { entries, summary } = await this.getStatement(agentId, currentUser, fromDate, toDate);
    const agent = await this.userRepo.findOne({ where: { id: agentId } });

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 45, size: 'A4' });

      const fontsDir = path.join(__dirname, '../assets/fonts');
      doc.registerFont('Body', path.join(fontsDir, 'Roboto-Regular.ttf'));
      doc.registerFont('Body-Bold', path.join(fontsDir, 'Roboto-Bold.ttf'));
      doc.registerFont('Body-Italic', path.join(fontsDir, 'Roboto-Italic.ttf'));
      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const money = (n: number) => `${Math.round(Number(n)).toLocaleString('tr-TR')} ₺`;
      const dateLabel = (d: string) => new Date(d).toLocaleDateString('tr-TR');
      const CATEGORY_LABELS: Record<string, string> = {
        commission: 'Komisyon Hakedişi',
        commission_payment: 'Ofis Ödemesi',
        agent_due: 'Aylık Ofis Aidatı',
        expense_chargeback: 'Masraf Yansıtma',
        manual: 'Manuel Kayıt',
      };

      // ========== BASLIK ==========
      doc.fontSize(18).font('Body-Bold').text('Cari Hesap Ekstresi', { align: 'center' });
      doc.fontSize(10).font('Body').fillColor('#666666').text('RE/MAX Bostancı', { align: 'center' });
      doc.fillColor('#000000');
      doc.moveDown(0.8);

      doc.fontSize(11).font('Body-Bold').text(`Danışman: ${agent?.name || 'Danışman'}`);
      doc.fontSize(9).font('Body').fillColor('#666666');
      const rangeLabel = fromDate && toDate ? `${dateLabel(fromDate)} — ${dateLabel(toDate)}` : 'Tüm Zamanlar';
      doc.text(`Dönem: ${rangeLabel}`);
      doc.text(`Rapor Tarihi: ${new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}`);
      doc.fillColor('#000000');
      doc.moveDown(0.8);

      // ========== OZET KARTLARI ==========
      const summaryY = doc.y;
      const boxW = 122;
      const boxes = [
        { label: 'Toplam Hakediş', value: money(summary.totalCredit), color: '#1e7a3d' },
        { label: 'Kesinti / Avans', value: money(summary.totalDeductions), color: '#8a6100' },
        { label: 'Yapılan Ödeme', value: money(summary.totalPayments), color: '#1f3a5f' },
        {
          label: 'Net Bakiye',
          value: `${summary.netBalance >= 0 ? 'Ofis Borçlu' : 'Danışman Borçlu'}: ${money(Math.abs(summary.netBalance))}`,
          color: summary.netBalance >= 0 ? '#1e7a3d' : '#b3261e',
        },
      ];
      boxes.forEach((b, i) => {
        const x = 45 + i * (boxW + 6);
        doc.rect(x, summaryY, boxW, 46).fillAndStroke('#f7f5ee', '#e3dfd2');
        doc.fontSize(7).font('Body').fillColor('#666666').text(b.label.toUpperCase(), x + 8, summaryY + 7, { width: boxW - 16 });
        doc.fontSize(9).font('Body-Bold').fillColor(b.color).text(b.value, x + 8, summaryY + 20, { width: boxW - 16 });
      });
      doc.fillColor('#000000');
      doc.y = summaryY + 58;
      doc.moveDown(0.5);

      // ========== HAREKET TABLOSU ==========
      doc.fontSize(11).font('Body-Bold').text('Hareket Dökümü');
      doc.moveDown(0.3);

      const colX = { date: 45, label: 105, debit: 340, credit: 415, balance: 490 };
      function drawHeader() {
        const y = doc.y;
        doc.fontSize(8).font('Body-Bold').fillColor('#666666');
        doc.text('TARİH', colX.date, y, { width: 55 });
        doc.text('AÇIKLAMA', colX.label, y, { width: 230 });
        doc.text('BORÇ', colX.debit, y, { width: 70, align: 'right' });
        doc.text('ALACAK', colX.credit, y, { width: 70, align: 'right' });
        doc.text('BAKİYE', colX.balance, y, { width: 65, align: 'right' });
        doc.fillColor('#000000');
        doc.moveDown(0.4);
        doc.moveTo(45, doc.y).lineTo(555, doc.y).strokeColor('#cccccc').stroke();
        doc.moveDown(0.3);
      }
      drawHeader();

      if (entries.length === 0) {
        doc.fontSize(9).font('Body-Italic').fillColor('#666666').text('Bu dönemde hareket bulunmuyor.');
        doc.fillColor('#000000');
      }

      entries.forEach((e) => {
        if (doc.y > 760) {
          doc.addPage();
          drawHeader();
        }
        const y = doc.y;
        doc.fontSize(8).font('Body');
        doc.text(dateLabel(e.date), colX.date, y, { width: 55 });
        doc.text(`${CATEGORY_LABELS[e.category] || e.category}: ${e.label}`, colX.label, y, { width: 230 });
        doc.fillColor(e.debit ? '#b3261e' : '#999999').text(e.debit ? money(e.debit) : '—', colX.debit, y, { width: 70, align: 'right' });
        doc.fillColor(e.credit ? '#1e7a3d' : '#999999').text(e.credit ? money(e.credit) : '—', colX.credit, y, { width: 70, align: 'right' });
        doc.fillColor(e.runningBalance >= 0 ? '#1e7a3d' : '#b3261e').font('Body-Bold');
        doc.text(`${e.runningBalance >= 0 ? '+' : '−'}${money(Math.abs(e.runningBalance))}`, colX.balance, y, { width: 65, align: 'right' });
        doc.fillColor('#000000').font('Body');
        doc.moveDown(0.5);
      });

      doc.fontSize(7).font('Body-Italic').fillColor('#999999');
      doc.text(
        'Bu ekstre, sistemdeki kayıtlı hareketlerden otomatik oluşturulmuştur ve resmi bir muhasebe belgesi yerine geçmez.',
        45,
        780,
        { width: 510, align: 'center' },
      );

      doc.end();
    });
  }
}
