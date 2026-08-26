import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Partner } from './partner.entity';
import { PartnerLedgerEntry, PartnerLedgerType } from './partner-ledger-entry.entity';
import { CreatePartnerDto } from './dto/create-partner.dto';
import { UpdatePartnerDto } from './dto/update-partner.dto';
import { CreatePartnerAdjustmentDto } from './dto/create-partner-adjustment.dto';
import { DistributeProfitDto } from './dto/distribute-profit.dto';
import { BankTransaction, BankTransactionType } from '../bank-accounts/bank-transaction.entity';

@Injectable()
export class PartnersService {
  constructor(
    @InjectRepository(Partner) private readonly partnerRepo: Repository<Partner>,
    @InjectRepository(PartnerLedgerEntry) private readonly ledgerRepo: Repository<PartnerLedgerEntry>,
    @InjectRepository(BankTransaction) private readonly bankTransactionRepo: Repository<BankTransaction>,
  ) {}

  async create(dto: CreatePartnerDto): Promise<Partner> {
    const partner = this.partnerRepo.create(dto);
    return this.partnerRepo.save(partner);
  }

  async findAll(): Promise<Partner[]> {
    return this.partnerRepo.find({ order: { createdAt: 'ASC' } });
  }

  async update(id: string, dto: UpdatePartnerDto): Promise<Partner> {
    const partner = await this.partnerRepo.findOne({ where: { id } });
    if (!partner) {
      throw new NotFoundException('Ortak bulunamadı');
    }
    Object.assign(partner, dto);
    return this.partnerRepo.save(partner);
  }

  async remove(id: string): Promise<void> {
    const partner = await this.partnerRepo.findOne({ where: { id } });
    if (!partner) {
      throw new NotFoundException('Ortak bulunamadı');
    }
    await this.ledgerRepo.delete({ partnerId: id });
    await this.partnerRepo.remove(partner);
  }

  async getBalance(partnerId: string): Promise<number> {
    const entries = await this.ledgerRepo.find({ where: { partnerId } });
    return entries.reduce((sum, e) => sum + (e.type === PartnerLedgerType.CREDIT ? Number(e.amount) : -Number(e.amount)), 0);
  }

  async getSummary(): Promise<Record<string, number>> {
    const partners = await this.partnerRepo.find();
    const result: Record<string, number> = {};
    for (const p of partners) {
      result[p.id] = await this.getBalance(p.id);
    }
    return result;
  }

  async getHistory(partnerId: string): Promise<PartnerLedgerEntry[]> {
    return this.ledgerRepo.find({ where: { partnerId }, order: { date: 'DESC', createdAt: 'DESC' } });
  }

  async addAdjustment(partnerId: string, dto: CreatePartnerAdjustmentDto): Promise<PartnerLedgerEntry> {
    const partner = await this.partnerRepo.findOne({ where: { id: partnerId } });
    if (!partner) {
      throw new NotFoundException('Ortak bulunamadı');
    }
    const entry = this.ledgerRepo.create({
      partnerId,
      type: dto.type,
      amount: dto.amount,
      description: dto.description,
      date: dto.date,
      source: 'manual',
      distributionPeriod: null,
      bankAccountId: dto.bankAccountId,
    });
    const saved = await this.ledgerRepo.save(entry);

    // KRITIK DUZELTME: hicbir para hareketi "havada" kalamaz -- diger 5
    // finans modulunun (Gider, Aidat, Komisyon, Cek/Senet, Danisman
    // Cari) hepsinin uydugu kurala Ortak Cari de artik uyuyor. CREDIT
    // (ortak para YATIRDI) -> hesap ARTAR (DEPOSIT). DEBIT (ofis ortaga
    // ODEME yapti -- sermaye iadesi/kar payi odemesi) -> hesap AZALIR
    // (WITHDRAWAL).
    const transaction = this.bankTransactionRepo.create({
      bankAccountId: dto.bankAccountId,
      type: dto.type === PartnerLedgerType.CREDIT ? BankTransactionType.DEPOSIT : BankTransactionType.WITHDRAWAL,
      amount: dto.amount,
      date: dto.date,
      description: `Ortak Cari (${partner.name}): ${dto.description}`,
      source: 'partner_ledger',
      sourceId: saved.id,
    });
    await this.bankTransactionRepo.save(transaction);

    return saved;
  }

  async removeAdjustment(entryId: string): Promise<void> {
    const entry = await this.ledgerRepo.findOne({ where: { id: entryId } });
    if (!entry) {
      throw new NotFoundException('Hareket bulunamadı');
    }
    await this.bankTransactionRepo.delete({ source: 'partner_ledger', sourceId: entryId });
    await this.ledgerRepo.remove(entry);
  }

  async distributeProfit(dto: DistributeProfitDto): Promise<PartnerLedgerEntry[]> {
    const alreadyDistributed = await this.ledgerRepo.findOne({
      where: { source: 'profit_distribution', distributionPeriod: dto.period },
    });
    if (alreadyDistributed) {
      throw new BadRequestException(`${dto.period} dönemi için kâr dağıtımı zaten yapılmış.`);
    }

    const activePartners = await this.partnerRepo.find({ where: { isActive: true } });
    if (activePartners.length === 0) {
      throw new BadRequestException('Aktif ortak bulunamadı.');
    }

    const totalShare = activePartners.reduce((sum, p) => sum + Number(p.sharePercentage), 0);
    if (Math.abs(totalShare - 100) > 0.01) {
      throw new BadRequestException(
        `Aktif ortakların hisse toplamı %${totalShare.toFixed(2)} — %100 olmalı. Lütfen ortak hisselerini düzeltin.`,
      );
    }

    const entries = activePartners.map((p) =>
      this.ledgerRepo.create({
        partnerId: p.id,
        type: PartnerLedgerType.CREDIT,
        amount: (dto.netProfitAmount * Number(p.sharePercentage)) / 100,
        description: `${dto.period} dönemi kâr payı (%${p.sharePercentage})`,
        date: new Date().toISOString().slice(0, 10),
        source: 'profit_distribution',
        distributionPeriod: dto.period,
      }),
    );

    return this.ledgerRepo.save(entries);
  }
}
