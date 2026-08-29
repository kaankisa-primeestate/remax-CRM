import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum AccountingCommissionStatus {
  PENDING = 'pending_collection',
  COLLECTED = 'collected',
  PAID = 'agent_paid',
  VOIDED = 'voided',
}

@Entity('accounting_commissions')
@Index(['agentId', 'date'])
@Index(['status', 'date'])
export class AccountingCommission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // CRM'deki User kaydı. Danışmanın adı ayrıca snapshot olarak tutulur;
  // danışman adı değişse bile eski kapama anlaşılır kalır.
  @Column({ type: 'uuid' })
  agentId: string;

  // Bu komisyonun hangi Islem'den (Transaction) dogdugunu izler --
  // Danisman "Kapanisi Yap" dedigi anda BURADAN otomatik komisyon
  // olusturulur, iliskiyi kaybetmemek icin saklanir.
  @Column({ type: 'uuid', nullable: true })
  transactionId: string | null;

  // Aynı form gönderiminin çift tıklama/retry ile iki kez oluşmasını önler.
  @Column({ type: 'varchar', length: 100, nullable: true, unique: true })
  idempotencyKey: string | null;

  @Column({ type: 'varchar' })
  agentNameSnapshot: string;

  @Column({ type: 'varchar' })
  transactionType: string;

  @Column({ type: 'varchar', nullable: true })
  propertyTitle: string | null;

  @Column({ type: 'date' })
  date: string;

  // Kapama sırasında elle girilen ve şirkete tahsil edilecek brüt komisyon.
  @Column({ type: 'numeric', precision: 14, scale: 2 })
  grossAmount: number;

  @Column({ type: 'varchar', length: 3 })
  currency: string;

  // İşlem anında danışman profilinden okunup snapshot olarak saklanır.
  @Column({ type: 'numeric', precision: 5, scale: 2 })
  agentSharePercent: number;

  @Column({ type: 'numeric', precision: 14, scale: 2 })
  agentGrossShare: number;

  @Column({ type: 'numeric', precision: 14, scale: 2 })
  officeShare: number;

  @Column({ type: 'enum', enum: AccountingCommissionStatus })
  status: AccountingCommissionStatus;

  @Column({ type: 'uuid', nullable: true })
  collectionAccountId: string | null;

  @Column({ type: 'uuid', nullable: true })
  collectionEntryId: string | null;

  @Column({ type: 'date', nullable: true })
  collectedAt: string | null;

  @Column({ type: 'uuid', nullable: true })
  paymentAccountId: string | null;

  @Column({ type: 'uuid', nullable: true })
  paymentEntryId: string | null;

  @Column({ type: 'date', nullable: true })
  paidAt: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'timestamp', nullable: true })
  voidedAt: Date | null;

  @Column({ type: 'uuid', nullable: true })
  createdBy: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
