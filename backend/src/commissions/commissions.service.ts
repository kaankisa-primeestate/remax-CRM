import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Commission } from './commission.entity';
import { CreateCommissionDto } from './create-commission.dto';
import { CommissionPayment } from './commission-payment.entity';
import { CreateCommissionPaymentDto } from './dto/create-commission-payment.dto';
import { BankTransaction, BankTransactionType } from '../bank-accounts/bank-transaction.entity';
import { Transaction } from '../transactions/transaction.entity';
import { ChequeNote, ChequeNoteType, ChequeNoteDirection, ChequeNoteStatus } from '../cheque-notes/cheque-note.entity';

@Injectable()
export class CommissionsService {
  constructor(
    @InjectRepository(Commission)
    private commissionsRepository: Repository<Commission>,
    @InjectRepository(CommissionPayment)
    private paymentsRepository: Repository<CommissionPayment>,
    @InjectRepository(BankTransaction)
    private bankTransactionRepository: Repository<BankTransaction>,
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    @InjectRepository(ChequeNote)
    private chequeNoteRepository: Repository<ChequeNote>,
  ) {}

  private calculateAmounts(dto: {
    transactionAmount: number;
    commissionRate: number;
    agentSharePercent: number;
    withholdingTaxPercent?: number;
    vatPercent?: number;
    penaltyAmount?: number;
  }) {
    const grossCommission =
      (dto.transactionAmount * dto.commissionRate) / 100;
    const agentGrossShare =
      (grossCommission * dto.agentSharePercent) / 100;

    const withholding =
      (agentGrossShare * (dto.withholdingTaxPercent || 0)) / 100;
    const vat = (agentGrossShare * (dto.vatPercent || 0)) / 100;
    const penalty = dto.penaltyAmount || 0;

    const netPayable = agentGrossShare - withholding - vat - penalty;

    return { grossCommission, agentGrossShare, netPayable };
  }

  async create(
    dto: CreateCommissionDto,
    requestingUserId: string,
    requestingUserRole: string,
  ): Promise<Commission[]> {
    // Danışman sadece kendi adına kayıt girebilir; Broker istediği danışman adına girebilir
    let agentId = dto.agentId;
    if (requestingUserRole === 'agent') {
      agentId = requestingUserId;
    } else if (!agentId && !dto.transactionId) {
      throw new ForbiddenException(
        'Broker bir danışman seçmelidir (agentId zorunlu)',
      );
    }

    // Isbirlikli Satis kontrolu: bir Transaction'a baglanmis VE o
    // Transaction'da onaylanmis (splitFinalizedAt dolu) bir paylasim
    // varsa, komisyon OTOMATIK OLARAK iki ayri kayit halinde olusturulur
    // -- her danismana kendi payina dusen tutar. agentSharePercent,
    // orijinal degerin (dto'dan gelen, orn. ofisin danisman payi
    // politikasi %50) uzerine Transaction'daki paylasim orani
    // UYGULANARAK hesaplanir -- boylece mevcut hesaplama zincirine
    // (calculateAmounts) hicbir degisiklik yapmadan dogru sonuc cikar.
    if (dto.transactionId) {
      const transaction = await this.transactionRepository.findOne({
        where: { id: dto.transactionId },
      });
      if (!transaction) {
        throw new NotFoundException('İşlem bulunamadı');
      }
      if (transaction.collaboratorAgentId && transaction.splitFinalizedAt) {
        const ownerAgentId = transaction.agentId;
        const collaboratorAgentId = transaction.collaboratorAgentId;
        const ownerSplitPercent = Number(transaction.commissionSplitPercentage ?? 50);
        const collaboratorSplitPercent = 100 - ownerSplitPercent;

        const baseSharePercent = Number(dto.agentSharePercent);

        const ownerDto = {
          ...dto,
          agentSharePercent: (baseSharePercent * ownerSplitPercent) / 100,
        };
        const { grossCommission: g1, agentGrossShare: a1, netPayable: n1 } =
          this.calculateAmounts(ownerDto);
        const ownerCommission = this.commissionsRepository.create({
          ...dto,
          agentId: ownerAgentId,
          agentSharePercent: ownerDto.agentSharePercent,
          grossCommission: g1,
          agentGrossShare: a1,
          netPayable: n1,
          withholdingTaxPercent: dto.withholdingTaxPercent || 0,
          vatPercent: dto.vatPercent || 0,
          penaltyAmount: dto.penaltyAmount || 0,
          transactionId: transaction.id,
          collaboratorAgentId: collaboratorAgentId,
          collaboratorSplitPercent: ownerSplitPercent,
        });

        const collaboratorDto = {
          ...dto,
          agentSharePercent: (baseSharePercent * collaboratorSplitPercent) / 100,
        };
        const { grossCommission: g2, agentGrossShare: a2, netPayable: n2 } =
          this.calculateAmounts(collaboratorDto);
        const collaboratorCommission = this.commissionsRepository.create({
          ...dto,
          agentId: collaboratorAgentId,
          agentSharePercent: collaboratorDto.agentSharePercent,
          grossCommission: g2,
          agentGrossShare: a2,
          netPayable: n2,
          withholdingTaxPercent: dto.withholdingTaxPercent || 0,
          vatPercent: dto.vatPercent || 0,
          penaltyAmount: dto.penaltyAmount || 0,
          transactionId: transaction.id,
          collaboratorAgentId: ownerAgentId,
          collaboratorSplitPercent: collaboratorSplitPercent,
        });

        return this.commissionsRepository.save([ownerCommission, collaboratorCommission]);
      }
    }

    if (!agentId) {
      throw new ForbiddenException(
        'Broker bir danışman seçmelidir (agentId zorunlu)',
      );
    }

    const { grossCommission, agentGrossShare, netPayable } =
      this.calculateAmounts(dto);

    const commission = this.commissionsRepository.create({
      ...dto,
      agentId,
      grossCommission,
      agentGrossShare,
      netPayable,
      withholdingTaxPercent: dto.withholdingTaxPercent || 0,
      vatPercent: dto.vatPercent || 0,
      penaltyAmount: dto.penaltyAmount || 0,
    });

    const saved = await this.commissionsRepository.save(commission);
    return [saved];
  }

  async findAll(
    requestingUserId: string,
    requestingUserRole: string,
    filters: {
      agentId?: string;
      status?: string;
      fromDate?: string;
      toDate?: string;
    },
  ) {
    const query = this.commissionsRepository.createQueryBuilder('commission');

    if (requestingUserRole === 'agent') {
      query.andWhere('commission.agentId = :agentId', {
        agentId: requestingUserId,
      });
    } else if (filters.agentId) {
      query.andWhere('commission.agentId = :agentId', {
        agentId: filters.agentId,
      });
    }

    if (filters.status) {
      query.andWhere('commission.status = :status', {
        status: filters.status,
      });
    }

    if (filters.fromDate) {
      query.andWhere('commission.dueDate >= :fromDate', {
        fromDate: filters.fromDate,
      });
    }

    if (filters.toDate) {
      query.andWhere('commission.dueDate <= :toDate', {
        toDate: filters.toDate,
      });
    }

    query.orderBy('commission.dueDate', 'DESC');

    return query.getMany();
  }

  async findOne(
    id: string,
    requestingUserId: string,
    requestingUserRole: string,
  ) {
    const commission = await this.commissionsRepository.findOne({
      where: { id },
    });
    if (!commission) {
      throw new NotFoundException('Komisyon kaydı bulunamadı');
    }
    if (
      requestingUserRole === 'agent' &&
      commission.agentId !== requestingUserId
    ) {
      throw new ForbiddenException('Bu kayda erişim yetkiniz yok');
    }
    return commission;
  }

  async update(
    id: string,
    dto: Partial<CreateCommissionDto> & { status?: string },
    requestingUserId: string,
    requestingUserRole: string,
  ) {
    const commission = await this.findOne(
      id,
      requestingUserId,
      requestingUserRole,
    );

    // Danışman sadece durumunu değiştiremez, sadece Broker onaylayıp ödeyebilir
    if (requestingUserRole === 'agent' && dto.status) {
      throw new ForbiddenException(
        'Durum değişikliğini sadece Broker yapabilir',
      );
    }

    const statusChanging = dto.status !== undefined && dto.status !== commission.status;

    const merged = { ...commission, ...dto } as any;
    const { grossCommission, agentGrossShare, netPayable } =
      this.calculateAmounts(merged);

    Object.assign(commission, dto, {
      grossCommission,
      agentGrossShare,
      netPayable,
    });
    if (statusChanging) {
      commission.statusChangedAt = new Date();
    }

    return this.commissionsRepository.save(commission);
  }

  async remove(id: string, requestingUserRole: string) {
    if (requestingUserRole !== 'broker') {
      throw new ForbiddenException('Sadece Broker silebilir');
    }
    const commission = await this.commissionsRepository.findOne({
      where: { id },
    });
    if (!commission) {
      throw new NotFoundException('Komisyon kaydı bulunamadı');
    }
    await this.commissionsRepository.remove(commission);
  }

  async summary(
    requestingUserId: string,
    requestingUserRole: string,
    filters: { agentId?: string; fromDate?: string; toDate?: string },
  ) {    const commissions = await this.findAll(
      requestingUserId,
      requestingUserRole,
      filters,
    );

    const totalGross = commissions.reduce(
      (sum, c) => sum + Number(c.grossCommission),
      0,
    );
    const totalNetPayable = commissions.reduce(
      (sum, c) => sum + Number(c.netPayable),
      0,
    );
    const totalPaid = commissions
      .filter((c) => c.status === 'paid')
      .reduce((sum, c) => sum + Number(c.netPayable), 0);
    const totalPending = commissions
      .filter((c) => c.status !== 'paid')
      .reduce((sum, c) => sum + Number(c.netPayable), 0);

    return {
      count: commissions.length,
      totalGross,
      totalNetPayable,
      totalPaid,
      totalPending,
    };
  }

  // --- Kismi Odeme Yonetimi ---
  // Danisman Cari Hesabi mantigi: bir komisyona birden fazla (kismi)
  // odeme eklenebilir. Kalan bakiye = netPayable - tum odemelerin
  // toplami. Kalan 0'a inince komisyon otomatik "Odendi" olur.

  async getPayments(commissionId: string): Promise<CommissionPayment[]> {
    return this.paymentsRepository.find({
      where: { commissionId },
      order: { date: 'DESC', createdAt: 'DESC' },
    });
  }

  async addPayment(
    commissionId: string,
    dto: CreateCommissionPaymentDto,
    requestingUserRole: string,
  ): Promise<CommissionPayment> {
    if (requestingUserRole !== 'broker') {
      throw new ForbiddenException('Sadece Broker ödeme kaydedebilir');
    }
    const commission = await this.commissionsRepository.findOne({ where: { id: commissionId } });
    if (!commission) {
      throw new NotFoundException('Komisyon kaydı bulunamadı');
    }

    const payment = this.paymentsRepository.create({ ...dto, commissionId });
    const saved = await this.paymentsRepository.save(payment);

    // Banka/kasa hesabi secildiyse, o hesaptan otomatik bir "cikis"
    // hareketi olustur -- ofis danismana para odedigi icin. AMA odeme
    // "Cek/Senet VERILEREK" yapiliyorsa, para HENUZ hesaptan CIKMADI --
    // bunun yerine bir ChequeNote (PAYABLE, henuz odenmedi) acilir,
    // gercek banka hareketi ancak vade tarihinde/odendiginde olusur.
    if (dto.paymentMethod === 'cheque' || dto.paymentMethod === 'note') {
      const chequeNote = this.chequeNoteRepository.create({
        type: dto.paymentMethod === 'cheque' ? ChequeNoteType.CHEQUE : ChequeNoteType.NOTE,
        direction: ChequeNoteDirection.PAYABLE,
        amount: dto.amount,
        dueDate: dto.chequeDueDate,
        drawerName: dto.chequeDrawerName || commission.propertyTitle || 'Danışman Ödemesi',
        bankAccountId: dto.bankAccountId || null,
        status: ChequeNoteStatus.PORTFOLIO,
        notes: `Komisyon ödemesi: ${commission.propertyTitle || commission.id}`,
      });
      await this.chequeNoteRepository.save(chequeNote);
    } else if (dto.bankAccountId) {
      const transaction = this.bankTransactionRepository.create({
        bankAccountId: dto.bankAccountId,
        type: BankTransactionType.WITHDRAWAL,
        amount: dto.amount,
        date: dto.date,
        description: `Komisyon ödemesi: ${commission.propertyTitle || commission.id}`,
        source: 'commission_payment',
        sourceId: saved.id,
      });
      await this.bankTransactionRepository.save(transaction);
    }

    // Kalan bakiye 0'a indiyse, komisyon otomatik "Odendi" olur.
    const allPayments = await this.getPayments(commissionId);
    const totalPaid = allPayments.reduce((sum, p) => sum + Number(p.amount), 0);
    if (totalPaid >= Number(commission.netPayable) && commission.status !== 'paid') {
      commission.status = 'paid' as any;
      commission.statusChangedAt = new Date();
      await this.commissionsRepository.save(commission);
    }

    return saved;
  }

  async removePayment(paymentId: string, requestingUserRole: string): Promise<void> {
    if (requestingUserRole !== 'broker') {
      throw new ForbiddenException('Sadece Broker ödeme silebilir');
    }
    const payment = await this.paymentsRepository.findOne({ where: { id: paymentId } });
    if (!payment) {
      throw new NotFoundException('Ödeme bulunamadı');
    }
    await this.bankTransactionRepository.delete({ source: 'commission_payment', sourceId: paymentId });
    await this.paymentsRepository.remove(payment);

    // Odeme silinince komisyon "Odendi" durumundaysa, kalan bakiye tekrar
    // olustugu icin "Onaylandi"ya geri donmeli.
    const commission = await this.commissionsRepository.findOne({ where: { id: payment.commissionId } });
    if (commission && commission.status === 'paid') {
      commission.status = 'approved' as any;
      commission.statusChangedAt = new Date();
      await this.commissionsRepository.save(commission);
    }
  }

  // --- Kademeli Prim (Sliding Scale) ---
  // Danismanin O YILKI (1 Ocak'tan bugune) toplam islem hacmine, YENI
  // islemin tutari da eklenerek, hangi kademeye girdigi hesaplanir ve
  // o kademenin orani ONERI olarak dondurulur. Bu SADECE bir oneri --
  // nihai karar (formdaki agentSharePercent alani) her zaman elle
  // degistirilebilir kalir, CMA'daki "sistem oneri sunar, insan karar
  // verir" ilkesiyle tutarli.
  async suggestRate(
    agentId: string,
    newTransactionAmount: number,
    tierRules: { threshold: number; rate: number }[] | null,
    fallbackRate: number | null,
  ): Promise<{ suggestedRate: number | null; ytdVolume: number; appliedTier: { threshold: number; rate: number } | null }> {
    if (!tierRules || tierRules.length === 0) {
      return { suggestedRate: fallbackRate, ytdVolume: 0, appliedTier: null };
    }

    const yearStart = `${new Date().getFullYear()}-01-01`;
    const yearEnd = `${new Date().getFullYear()}-12-31`;
    const ytdCommissions = await this.commissionsRepository
      .createQueryBuilder('c')
      .where('c.agentId = :agentId', { agentId })
      .andWhere('c.dueDate BETWEEN :from AND :to', { from: yearStart, to: yearEnd })
      .getMany();
    const ytdVolume = ytdCommissions.reduce((sum, c) => sum + Number(c.transactionAmount), 0);
    const cumulativeVolume = ytdVolume + Number(newTransactionAmount);

    // Kademeleri esik degerine gore artan sirala, cumulativeVolume'e
    // esit veya kucuk en yuksek esigi bul.
    const sortedTiers = [...tierRules].sort((a, b) => a.threshold - b.threshold);
    let appliedTier: { threshold: number; rate: number } | null = null;
    for (const tier of sortedTiers) {
      if (cumulativeVolume >= tier.threshold) {
        appliedTier = tier;
      }
    }

    return {
      suggestedRate: appliedTier ? appliedTier.rate : fallbackRate,
      ytdVolume,
      appliedTier,
    };
  }
}
