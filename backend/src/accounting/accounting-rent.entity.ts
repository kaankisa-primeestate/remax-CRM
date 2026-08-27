import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum AccountingRentStatus {
  PENDING = 'pending_collection',
  COLLECTED = 'collected',
  VOIDED = 'voided',
}

@Entity('accounting_rents')
@Index(['agentId', 'period'], { unique: true })
@Index(['period', 'status'])
export class AccountingRent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  agentId: string;

  @Column({ type: 'varchar' })
  agentNameSnapshot: string;

  // YYYY-MM; aynı danışman ve dönem için yalnızca bir tahakkuk oluşur.
  @Column({ type: 'varchar', length: 7 })
  period: string;

  @Column({ type: 'date' })
  dueDate: string;

  @Column({ type: 'numeric', precision: 14, scale: 2 })
  amount: number;

  // Danışman kayıt ekranındaki mevcut kira alanı ilk aşamada TL kabul edilir.
  // İleride danışman bazlı kira para birimi ayrıca eklenebilir.
  @Column({ type: 'varchar', length: 3, default: 'TRY' })
  currency: string;

  @Column({ type: 'enum', enum: AccountingRentStatus })
  status: AccountingRentStatus;

  @Column({ type: 'uuid', nullable: true })
  collectionAccountId: string | null;

  @Column({ type: 'uuid', nullable: true })
  collectionEntryId: string | null;

  @Column({ type: 'date', nullable: true })
  collectedAt: string | null;

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
