import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AgentDue } from './agent-due.entity';
import { GenerateDuesDto } from './dto/generate-dues.dto';
import { MarkPaidDto } from './dto/mark-paid.dto';
import { User, UserRole } from '../users/user.entity';
import { BankTransaction, BankTransactionType } from '../bank-accounts/bank-transaction.entity';
import { CurrentUserPayload } from '../auth/current-user.decorator';
import { AccountingAgentReadService } from '../accounting/accounting-agent-read.service';
import { AccountingRent, AccountingRentStatus } from '../accounting/accounting-rent.entity';

@Injectable()
export class AgentDuesService {
  constructor(
    @InjectRepository(AgentDue) private readonly dueRepo: Repository<AgentDue>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(BankTransaction) private readonly bankTransactionRepo: Repository<BankTransaction>,
    @InjectRepository(AccountingRent) private readonly accountingRentRepo: Repository<AccountingRent>,
    private readonly accountingAgentReadService: AccountingAgentReadService,
  ) {}

  // Broker: "Bu ayin aidatlarini olustur" -- aylik aidat tutari
  // tanimlanmis tum aktif danismanlar icin, o ay henuz kaydi yoksa
  // otomatik bir AccountingRent acar. Idempotent: zaten var olan
  // (agentId, period) ciftleri icin ikinci bir kayit ACMAZ (hem kod
  // seviyesinde hem de AccountingRent'in kendi unique index'i ile).
  // Broker'in elle tetikledigi endpoint -- yetki kontrolu yapar, sonra
  // asil isi generateForMonthInternal'a devreder.
  async generateForMonth(dto: GenerateDuesDto, currentUser: CurrentUserPayload): Promise<{ created: number; skipped: number }> {
    if (currentUser.role !== 'broker') {
      throw new ForbiddenException('Sadece Broker aidat kaydı oluşturabilir');
    }
    return this.generateForMonthInternal(dto.period);
  }

  // Cron job (otomasyon) tarafindan cagrilan, yetki kontrolu OLMAYAN ic
  // metod -- Broker'in elle tetikledigi generateForMonth ile AYNI
  // idempotent/muafiyet mantigini kullanir. GUNCELLEME: artik ESKI
  // AgentDue tablosuna DEGIL, dogrudan YENI AccountingRent tablosuna
  // yaziyor -- boylece danismanin "Aidatlarim" sayfasinda (Muhasebe
  // verisinden okuyor) otomatik olusan aidat HEMEN gorunur.
  async generateForMonthInternal(period: string): Promise<{ created: number; skipped: number }> {
    const agents = await this.userRepo.find({ where: { role: UserRole.AGENT } });
    let created = 0;
    let skipped = 0;
    for (const agent of agents) {
      if (agent.monthlyDuesAmount == null) {
        skipped++;
        continue;
      }
      // Muafiyet kontrolu: duesStartDate belirlenmisse VE istenen donem
      // o tarihten ONCE ise, bu danisman icin aidat OLUSTURULMAZ.
      if (agent.duesStartDate) {
        const startPeriod = agent.duesStartDate.slice(0, 7); // 'YYYY-MM'
        if (period < startPeriod) {
          skipped++;
          continue;
        }
      }
      const existing = await this.accountingRentRepo.findOne({ where: { agentId: agent.id, period } });
      if (existing) {
        skipped++;
        continue;
      }
      const rent = this.accountingRentRepo.create({
        agentId: agent.id,
        agentNameSnapshot: agent.name,
        period,
        dueDate: `${period}-01`,
        amount: agent.monthlyDuesAmount,
        currency: 'TRY',
        status: AccountingRentStatus.PENDING,
      });
      await this.accountingRentRepo.save(rent);
      created++;
    }
    return { created, skipped };
  }

  // Danisman sadece kendi aidatlarini, Broker tumunu gorur.
  async findAll(currentUser: CurrentUserPayload): Promise<any[]> {
    if (currentUser.role === 'agent') {
      return this.accountingAgentReadService.listRents(currentUser.userId);
    }
    return this.dueRepo.find({ order: { period: 'DESC' } });
  }

  async markPaid(id: string, dto: MarkPaidDto, currentUser: CurrentUserPayload): Promise<AgentDue> {
    if (currentUser.role !== 'broker') {
      throw new ForbiddenException('Sadece Broker ödeme işaretleyebilir');
    }
    const due = await this.dueRepo.findOne({ where: { id } });
    if (!due) {
      throw new NotFoundException('Aidat kaydı bulunamadı');
    }
    due.paid = true;
    due.paidDate = dto.paidDate;
    due.bankAccountId = dto.bankAccountId || null;
    due.notes = dto.notes || null;
    const saved = await this.dueRepo.save(due);

    // Banka/kasa hesabi secildiyse, aidat tutari kadar otomatik bir
    // "giris" hareketi olustur -- ofise para girdigi icin.
    if (dto.bankAccountId) {
      const transaction = this.bankTransactionRepo.create({
        bankAccountId: dto.bankAccountId,
        type: BankTransactionType.DEPOSIT,
        amount: due.expectedAmount,
        date: dto.paidDate,
        description: `Aidat: ${due.period}`,
        source: 'agent_due',
        sourceId: due.id,
      });
      await this.bankTransactionRepo.save(transaction);
    }

    return saved;
  }

  async remove(id: string, currentUser: CurrentUserPayload): Promise<void> {
    if (currentUser.role !== 'broker') {
      throw new ForbiddenException('Sadece Broker aidat kaydı silebilir');
    }
    const due = await this.dueRepo.findOne({ where: { id } });
    if (!due) {
      throw new NotFoundException('Aidat kaydı bulunamadı');
    }
    await this.bankTransactionRepo.delete({ source: 'agent_due', sourceId: id });
    await this.dueRepo.remove(due);
  }
}
