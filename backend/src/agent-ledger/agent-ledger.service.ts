import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Commission } from '../commissions/commission.entity';
import { CommissionPayment } from '../commissions/commission-payment.entity';
import { AgentLedgerAdjustment, LedgerAdjustmentType } from './agent-ledger-adjustment.entity';
import { BankTransaction, BankTransactionType } from '../bank-accounts/bank-transaction.entity';
import { CreateAdjustmentDto } from './dto/create-adjustment.dto';
import { CurrentUserPayload } from '../auth/current-user.decorator';

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
  ) {}

  private assertAccess(agentId: string, currentUser: CurrentUserPayload) {
    if (currentUser.role === 'agent' && currentUser.userId !== agentId) {
      throw new ForbiddenException('Bu cari hesaba erişim yetkiniz yok');
    }
  }

  async getBalance(agentId: string, currentUser: CurrentUserPayload): Promise<number> {
    this.assertAccess(agentId, currentUser);
    const commissions = await this.commissionRepo.find({
      where: { agentId, status: In(['approved', 'paid']) as any },
    });
    const commissionIds = commissions.map((c) => c.id);
    const payments = commissionIds.length
      ? await this.paymentRepo.find({ where: { commissionId: In(commissionIds) } })
      : [];
    const adjustments = await this.adjustmentRepo.find({ where: { agentId } });

    const totalOwed = commissions.reduce((sum, c) => sum + Number(c.netPayable), 0);
    const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const totalCredit = adjustments
      .filter((a) => a.type === LedgerAdjustmentType.CREDIT)
      .reduce((sum, a) => sum + Number(a.amount), 0);
    const totalDebit = adjustments
      .filter((a) => a.type === LedgerAdjustmentType.DEBIT)
      .reduce((sum, a) => sum + Number(a.amount), 0);

    return totalOwed - totalPaid + totalCredit - totalDebit;
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
}
