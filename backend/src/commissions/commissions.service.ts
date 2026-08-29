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
import { AccountingAgentReadService } from '../accounting/accounting-agent-read.service';
import { AccountingCommission, AccountingCommissionStatus } from '../accounting/accounting-commission.entity';
import { User } from '../users/user.entity';

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
    @InjectRepository(AccountingCommission)
    private accountingCommissionRepository: Repository<AccountingCommission>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private readonly accountingAgentReadService: AccountingAgentReadService,
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
  ): Promise<AccountingCommission[]> {
    // KRITIK DUZELTME: Bu metod HALA "agent icin yasak" durumundaydi,
    // ama Danisman'in Islem Dosyasi'ndaki "Kapanisi Yap & Broker
    // Onayina Gonder" butonu TAM OLARAK bu API'yi cagiriyor -- yani
    // danismanlar islem kapatamiyor olmali (403 aliyor olmaliydi).
    // Artik komisyon dogrudan YENI Muhasebe tablosuna (AccountingCommission)
    // yaziliyor, ve danismanin KENDI islemi icin komisyon olusturmasina
    // izin veriliyor (baskasi adina degil -- guvenlik icin transactionId
    // uzerinden agentId/collaboratorAgentId dogrulaniyor).
    let agentId = dto.agentId;
    // KRITIK KURAL: Danisman icin komisyon SADECE "Islemler" uzerinden
    // GERCEK bir kapanistan olusabilir -- transactionId ZORUNLU. Bu
    // olmadan, Danisman "Komisyonlar" sayfasindan (varsa) elle, hicbir
    // islemle iliskisi olmayan bir kayit OLUSTURAMAZ. Broker (Muhasebe
    // uzerinden) zaten farkli, kendi mekanizmasini kullaniyor.
    if (requestingUserRole === 'agent' && !dto.transactionId) {
      throw new ForbiddenException('Komisyon kaydı sadece bir İşlem üzerinden (Kapanışı Yap) oluşturulabilir');
    }
    if (!agentId && !dto.transactionId) {
      throw new ForbiddenException(
        'Bir danışman seçilmelidir (agentId zorunlu)',
      );
    }

    if (dto.transactionId) {
      const transaction = await this.transactionRepository.findOne({
        where: { id: dto.transactionId },
      });
      if (!transaction) {
        throw new NotFoundException('İşlem bulunamadı');
      }

      // Guvenlik: danisman SADECE kendi islemi (sahibi ya da isbirlikci
      // olarak atanmis oldugu) icin komisyon olusturabilir.
      if (
        requestingUserRole === 'agent' &&
        transaction.agentId !== requestingUserId &&
        transaction.collaboratorAgentId !== requestingUserId
      ) {
        throw new ForbiddenException('Bu işlem için komisyon oluşturma yetkiniz yok');
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
        const { grossCommission: g1, agentGrossShare: a1 } =
          this.calculateAmounts(ownerDto);
        const ownerCommission = await this.createAccountingCommission({
          agentId: ownerAgentId,
          transactionId: transaction.id,
          propertyTitle: dto.propertyTitle,
          transactionType: dto.transactionType,
          date: dto.dueDate,
          grossAmount: g1,
          agentSharePercent: ownerDto.agentSharePercent,
          agentGrossShare: a1,
          notes: dto.notes,
          createdBy: requestingUserId,
        });

        const collaboratorDto = {
          ...dto,
          agentSharePercent: (baseSharePercent * collaboratorSplitPercent) / 100,
        };
        const { grossCommission: g2, agentGrossShare: a2 } =
          this.calculateAmounts(collaboratorDto);
        const collaboratorCommission = await this.createAccountingCommission({
          agentId: collaboratorAgentId,
          transactionId: transaction.id,
          propertyTitle: dto.propertyTitle,
          transactionType: dto.transactionType,
          date: dto.dueDate,
          grossAmount: g2,
          agentSharePercent: collaboratorDto.agentSharePercent,
          agentGrossShare: a2,
          notes: dto.notes,
          createdBy: requestingUserId,
        });

        return [ownerCommission, collaboratorCommission];
      }

      // Isbirlikci yoksa/onaylanmamissa, tek danisman = islem sahibi
      agentId = agentId || transaction.agentId;
    }

    if (!agentId) {
      throw new ForbiddenException('Bir danışman seçilmelidir (agentId zorunlu)');
    }

    const { grossCommission, agentGrossShare } = this.calculateAmounts(dto);

    const commission = await this.createAccountingCommission({
      agentId,
      transactionId: dto.transactionId || null,
      propertyTitle: dto.propertyTitle,
      transactionType: dto.transactionType,
      date: dto.dueDate,
      grossAmount: grossCommission,
      agentSharePercent: Number(dto.agentSharePercent),
      agentGrossShare,
      notes: dto.notes,
      createdBy: requestingUserId,
    });

    return [commission];
  }

  // Islem kapanisindan (ya da Broker'in Komisyonlar formundan) gelen
  // veriyle DOGRUDAN AccountingCommission olusturur -- oran, danismanin
  // profilindeki SABIT paydan degil, bu cagrida VERILEN degerden (islem
  // bazinda esneklik -- ozellikle isbirlikli satista pay bolunmesi icin
  // gerekli) hesaplanir.
  private async createAccountingCommission(params: {
    agentId: string;
    transactionId: string | null;
    propertyTitle?: string;
    transactionType: string;
    date: string;
    grossAmount: number;
    agentSharePercent: number;
    agentGrossShare: number;
    notes?: string;
    createdBy: string;
  }): Promise<AccountingCommission> {
    const agent = await this.userRepository.findOne({ where: { id: params.agentId } });
    if (!agent) {
      throw new NotFoundException('Danışman bulunamadı');
    }

    // Ayni islemden ayni danismana IKINCI KEZ kayit olusmasin (orn.
    // "Kapanisi Yap" butonuna yanlislikla iki kez basilirsa).
    if (params.transactionId) {
      const existing = await this.accountingCommissionRepository.findOne({
        where: { transactionId: params.transactionId, agentId: params.agentId },
      });
      if (existing) return existing;
    }

    const officeShare = params.grossAmount - params.agentGrossShare;

    const commission = this.accountingCommissionRepository.create({
      agentId: params.agentId,
      transactionId: params.transactionId,
      agentNameSnapshot: agent.name,
      transactionType: params.transactionType,
      propertyTitle: params.propertyTitle?.trim() || null,
      date: params.date,
      grossAmount: params.grossAmount,
      currency: 'TRY',
      agentSharePercent: params.agentSharePercent,
      agentGrossShare: params.agentGrossShare,
      officeShare,
      status: AccountingCommissionStatus.PENDING,
      notes: params.notes?.trim() || null,
      createdBy: params.createdBy,
    });

    return this.accountingCommissionRepository.save(commission);
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
    if (requestingUserRole === 'agent') {
      return this.accountingAgentReadService.listCommissions(requestingUserId, {
        status: filters.status,
        fromDate: filters.fromDate,
        toDate: filters.toDate,
      });
    }

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
    if (requestingUserRole === 'agent') {
      const accountingCommission = await this.accountingAgentReadService.findCommission(requestingUserId, id);
      if (!accountingCommission) {
        throw new NotFoundException('Komisyon kaydı bulunamadı');
      }
      return accountingCommission;
    }

    // Broker: eski Commission tablosuna DEGIL, YENI AccountingCommission
    // tablosuna bakiyor -- create() artik SADECE bu tabloya yaziyor,
    // eski tabloya bakmaya devam etmek "bulunamadi" hatasi verirdi.
    const commission = await this.accountingCommissionRepository.findOne({ where: { id } });
    if (!commission) {
      throw new NotFoundException('Komisyon kaydı bulunamadı');
    }
    return commission;
  }

  async update(
    id: string,
    dto: Partial<CreateCommissionDto> & { status?: string },
    requestingUserId: string,
    requestingUserRole: string,
  ) {
    // KRITIK DUZELTME: Bu metod artik kullanilmiyor -- Broker ZATEN
    // '/komisyonlar' sayfasina giremiyor (dogrudan '/muhasebe'ye
    // yonlendiriliyor), ve Danisman zaten asagida engelleniyor. Komisyon
    // durumu (tahsil/ode) artik SADECE Muhasebe modulunun kendi
    // 'collectCommission'/'payCommission' akisiyla degistirilebilir --
    // eskiden burada AccountingCommission'in ESKI Commission alan
    // isimleriyle (grossCommission/netPayable) YANLIS guncellenmeye
    // calisiliyordu (hicbir zaman calismasa da, kod TUTARSIZDI).
    throw new ForbiddenException('Komisyon kayıtları artık sadece Muhasebe modülünden yönetilir');
  }

  async remove(id: string, requestingUserRole: string) {
    throw new ForbiddenException('Komisyon kayıtları artık sadece Muhasebe modülünden yönetilir');
  }

  async summary(
    requestingUserId: string,
    requestingUserRole: string,
    filters: { agentId?: string; fromDate?: string; toDate?: string },
  ) {
    if (requestingUserRole === 'agent') {
      return this.accountingAgentReadService.summarizeCommissions(requestingUserId, filters);
    }

    const commissions = await this.findAll(
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

  async getPayments(
    commissionId: string,
    requestingUserId?: string,
    requestingUserRole?: string,
  ): Promise<any[]> {
    if (requestingUserRole === 'agent' && requestingUserId) {
      const payments = await this.accountingAgentReadService.listCommissionPayments(
        requestingUserId,
        commissionId,
      );
      if (!payments) throw new NotFoundException('Komisyon kaydı bulunamadı');
      return payments;
    }
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
