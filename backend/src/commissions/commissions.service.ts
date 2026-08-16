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

@Injectable()
export class CommissionsService {
  constructor(
    @InjectRepository(Commission)
    private commissionsRepository: Repository<Commission>,
    @InjectRepository(CommissionPayment)
    private paymentsRepository: Repository<CommissionPayment>,
    @InjectRepository(BankTransaction)
    private bankTransactionRepository: Repository<BankTransaction>,
  ) {}

  private calculateAmounts(dto: CreateCommissionDto) {
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
  ) {
    // Danışman sadece kendi adına kayıt girebilir; Broker istediği danışman adına girebilir
    let agentId = dto.agentId;
    if (requestingUserRole === 'agent') {
      agentId = requestingUserId;
    } else if (!agentId) {
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

    return this.commissionsRepository.save(commission);
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
  ) {
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
    // hareketi olustur -- ofis danismana para odedigi icin.
    if (dto.bankAccountId) {
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
}
