import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, Repository } from 'typeorm';
import { Appointment } from '../appointments/appointment.entity';
import { Task } from '../tasks/task.entity';
import { Transaction } from '../transactions/transaction.entity';
import { Commission, CommissionStatus } from '../commissions/commission.entity';
import { AgentDue } from '../agent-dues/agent-due.entity';
import { Property } from '../portfolios/property.entity';
import { Customer } from '../customers/customer.entity';
import { CurrentUserPayload } from '../auth/current-user.decorator';

export type CalendarEventType =
  | 'appointment'
  | 'task'
  | 'transaction_showing'
  | 'offer_validity'
  | 'commission_due'
  | 'agent_due'
  | 'contract_end';

export interface CalendarEvent {
  id: string;
  type: CalendarEventType;
  date: string; // YYYY-MM-DD
  time: string | null;
  title: string;
  subtitle: string | null;
  completed: boolean; // gorev/randevu icin anlamli, digerleri icin hep false
  overdue: boolean; // bugunden once VE tamamlanmamis/odenmemis
  linkPath: string | null; // tiklaninca gidilecek sayfa (frontend route)
}

// Takvim, sistemdeki 7 FARKLI kaynaktan (Randevu, Gorev, Islem Gosterim
// Tarihi, Teklif Gecerlilik Tarihi, Komisyon Vadesi, Aidat Odeme Tarihi,
// Portfoy Sozlesme Bitisi) gelen tarihli kayitlari TEK bir listede
// birlestirir. Bunlarin cogu zaten baska ekranlarda giriliyor -- danisman
// icin EK bir veri girisi gerektirmeden, var olan bilgiyi tek bir
// gorunumde toplamak amaciyla tasarlandi.
@Injectable()
export class CalendarService {
  constructor(
    @InjectRepository(Appointment) private readonly appointmentRepo: Repository<Appointment>,
    @InjectRepository(Task) private readonly taskRepo: Repository<Task>,
    @InjectRepository(Transaction) private readonly transactionRepo: Repository<Transaction>,
    @InjectRepository(Commission) private readonly commissionRepo: Repository<Commission>,
    @InjectRepository(AgentDue) private readonly agentDueRepo: Repository<AgentDue>,
    @InjectRepository(Property) private readonly propertyRepo: Repository<Property>,
    @InjectRepository(Customer) private readonly customerRepo: Repository<Customer>,
  ) {}

  async getEvents(currentUser: CurrentUserPayload, from: string, to: string): Promise<CalendarEvent[]> {
    const agentId = currentUser.userId;
    const todayStr = new Date().toISOString().slice(0, 10);

    const [appointments, tasks, transactions, commissions, agentDues, properties] = await Promise.all([
      this.appointmentRepo.find({ where: { agentId, date: Between(from, to) } }),
      this.taskRepo.find({ where: { agentId, dueDate: Between(from, to) } }),
      this.transactionRepo.find({ where: { agentId } }),
      this.commissionRepo.find({ where: { agentId } }),
      this.agentDueRepo.find({ where: { agentId } }),
      this.propertyRepo.find({ where: { agentId } }),
    ]);

    // Musteri/portfoy basliklarini cozmek icin -- N+1 sorgu yerine tek
    // seferde ilgili tum kayitlari cekip Map ile eslestiriyoruz.
    const customerIds = [...new Set(appointments.map((a) => a.customerId).filter(Boolean) as string[])];
    const propertyIdsFromAppt = appointments.map((a) => a.propertyId).filter(Boolean) as string[];
    const allNeededPropertyIds = [...new Set([...propertyIdsFromAppt, ...transactions.map((t) => t.propertyId).filter(Boolean) as string[]])];
    const [relatedCustomers, relatedProperties] = await Promise.all([
      customerIds.length ? this.customerRepo.find({ where: { id: In(customerIds) } }) : Promise.resolve([]),
      allNeededPropertyIds.length ? this.propertyRepo.find({ where: { id: In(allNeededPropertyIds) } }) : Promise.resolve([]),
    ]);
    const customerNameById = new Map(relatedCustomers.map((c) => [c.id, `${c.firstName} ${c.lastName}`]));
    const propertyTitleById = new Map([...relatedProperties, ...properties].map((p) => [p.id, p.title]));

    const events: CalendarEvent[] = [];

    // 1) Randevular
    for (const a of appointments) {
      const typeLabel = { meeting: '👤 Görüşme', showing: '🏠 Gösterim', other: '📌 Randevu' }[a.type] || '📌 Randevu';
      events.push({
        id: `appointment-${a.id}`,
        type: 'appointment',
        date: a.date,
        time: a.time,
        title: `${typeLabel}: ${a.title}`,
        subtitle: a.customerId ? customerNameById.get(a.customerId) || null : a.propertyId ? propertyTitleById.get(a.propertyId) || null : null,
        completed: a.completed,
        overdue: !a.completed && a.date < todayStr,
        linkPath: '/takvim',
      });
    }

    // 2) Gorevler (tum gunluk, saatsiz)
    for (const t of tasks) {
      if (!t.dueDate) continue;
      events.push({
        id: `task-${t.id}`,
        type: 'task',
        date: t.dueDate,
        time: null,
        title: `✅ ${t.title}`,
        subtitle: t.customerId ? customerNameById.get(t.customerId) || null : null,
        completed: t.completed,
        overdue: !t.completed && t.dueDate < todayStr,
        linkPath: '/gorevler',
      });
    }

    // 3) Islem Gosterim Tarihi + 4) Teklif Gecerlilik Tarihi
    for (const tx of transactions) {
      const propTitle = tx.propertyId ? propertyTitleById.get(tx.propertyId) || 'Portföy' : 'Portföy';
      if (tx.showingDate) {
        const d = new Date(tx.showingDate).toISOString().slice(0, 10);
        if (d >= from && d <= to) {
          events.push({
            id: `tx-showing-${tx.id}`,
            type: 'transaction_showing',
            date: d,
            time: null,
            title: `🏠 Gösterim: ${propTitle}`,
            subtitle: 'İşlemler',
            completed: tx.stage !== 'showing',
            overdue: tx.stage === 'showing' && d < todayStr,
            linkPath: '/islemler',
          });
        }
      }
      if (tx.offerValidityDate) {
        const d = tx.offerValidityDate.slice(0, 10);
        if (d >= from && d <= to) {
          events.push({
            id: `tx-offer-${tx.id}`,
            type: 'offer_validity',
            date: d,
            time: null,
            title: `🏷️ Teklif Geçerlilik Sonu: ${propTitle}`,
            subtitle: 'İşlemler',
            completed: tx.stage !== 'offer',
            overdue: tx.stage === 'offer' && d < todayStr,
            linkPath: '/islemler',
          });
        }
      }
    }

    // 5) Komisyon Vade Tarihi -- sadece HENUZ ODENMEMIS olanlar (odenmis
    // eski kayitlar takvimde gereksiz kalabalik yaratir)
    for (const c of commissions) {
      if (c.status === CommissionStatus.PAID) continue;
      const d = c.dueDate?.slice(0, 10);
      if (!d || d < from || d > to) continue;
      events.push({
        id: `commission-${c.id}`,
        type: 'commission_due',
        date: d,
        time: null,
        title: `💰 Komisyon Vadesi: ${c.propertyTitle || 'İşlem'}`,
        subtitle: `${Number(c.netPayable).toLocaleString('tr-TR')} ₺`,
        completed: false,
        overdue: d < todayStr,
        linkPath: '/komisyonlar',
      });
    }

    // 6) Aidat Odeme Tarihi -- period (YYYY-MM) ayin 1'i olarak kabul edilir
    for (const due of agentDues) {
      if (due.paid) continue;
      const d = `${due.period}-01`;
      if (d < from || d > to) continue;
      events.push({
        id: `agent-due-${due.id}`,
        type: 'agent_due',
        date: d,
        time: null,
        title: `🧾 Aylık Ofis Aidatı (${due.period})`,
        subtitle: `${Number(due.expectedAmount).toLocaleString('tr-TR')} ₺`,
        completed: false,
        overdue: d < todayStr,
        linkPath: '/aidatlar',
      });
    }

    // 7) Portfoy Sozlesme Bitis Tarihi
    for (const p of properties) {
      if (!p.contractEndDate) continue;
      const d = p.contractEndDate.slice(0, 10);
      if (d < from || d > to) continue;
      const isActive = p.status === 'active';
      events.push({
        id: `contract-end-${p.id}`,
        type: 'contract_end',
        date: d,
        time: null,
        title: `📄 Sözleşme Bitişi: ${p.title}`,
        subtitle: 'Portföy',
        completed: !isActive,
        overdue: isActive && d < todayStr,
        linkPath: `/portfoyler/${p.id}`,
      });
    }

    return events.sort((a, b) => (a.date + (a.time || '00:00')).localeCompare(b.date + (b.time || '00:00')));
  }
}
