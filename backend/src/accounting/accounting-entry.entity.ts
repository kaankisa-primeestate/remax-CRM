import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum AccountingEntryType {
  INCOME = 'income',
  EXPENSE = 'expense',
  TRANSFER = 'transfer',
}

export enum AccountingPartyType {
  AGENT = 'agent',
  PARTNER = 'partner',
  CUSTOMER = 'customer',
  VENDOR = 'vendor',
  OTHER = 'other',
}

@Entity('accounting_entries')
@Index(['date'])
@Index(['currency', 'date'])
@Index(['sourceType', 'sourceId'])
export class AccountingEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: AccountingEntryType })
  type: AccountingEntryType;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'numeric', precision: 14, scale: 2 })
  amount: number;

  // Hareketin para birimi, hesabın para birimiyle aynı olmalıdır.
  @Column({ type: 'varchar', length: 3 })
  currency: string;

  // Banka, kasa veya kredi kartı hesabı. İlk sürümde nakit etkili
  // hareketler bir para hesabına bağlanır; ileride tahakkuk hareketleri
  // için nullable bırakılmıştır.
  @Column({ type: 'uuid', nullable: true })
  accountId: string | null;

  // Sadece transfer türünde kullanılır; iki hesabın da aynı para biriminde
  // olması servis katmanında doğrulanır.
  @Column({ type: 'uuid', nullable: true })
  counterAccountId: string | null;

  // Esnek kategori: komisyon, kira, market, müşteri yemeği, elektrik,
  // sermaye katkısı, ortak çekişi ve benzeri kullanıcı tanımları.
  @Column({ type: 'varchar' })
  category: string;

  // Cari kart altyapısı bağlanana kadar isim snapshot olarak saklanır.
  // İleride partyId mevcut User/Partner kaydına bağlanabilir.
  @Column({ type: 'varchar', nullable: true })
  partyType: AccountingPartyType | null;

  @Column({ type: 'uuid', nullable: true })
  partyId: string | null;

  @Column({ type: 'varchar', nullable: true })
  partyName: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', nullable: true })
  referenceNo: string | null;

  // CRM kaynaklı otomatik aktarımlar için idempotency anahtarı.
  @Column({ type: 'varchar', nullable: true, unique: true })
  sourceKey: string | null;

  @Column({ type: 'varchar', nullable: true })
  sourceType: string | null;

  @Column({ type: 'uuid', nullable: true })
  sourceId: string | null;

  @Column({ type: 'uuid', nullable: true })
  createdBy: string | null;

  // Kayıt silinmez; yanlış kayıt için tersine çevirme/iptal tarihi tutulur.
  @Column({ type: 'timestamp', nullable: true })
  voidedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
