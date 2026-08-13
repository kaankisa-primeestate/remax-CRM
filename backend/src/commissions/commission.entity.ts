import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum CommissionStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  PAID = 'paid',
}

@Entity()
export class Commission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // İlişkili kayıtlar (opsiyonel — sisteme kayıtlı olmayan bir işlem de girilebilir)
  @Column({ type: 'uuid', nullable: true })
  propertyId: string | null;

  @Column({ type: 'uuid', nullable: true })
  customerId: string | null;

  // Bu komisyonun ait olduğu danışman
  @Column({ type: 'uuid' })
  agentId: string;

  // İşlem bilgileri
  @Column({ type: 'varchar' })
  transactionType: string; // 'sale' | 'rent'

  @Column({ type: 'varchar', nullable: true })
  propertyTitle: string | null; // portföy sistemde yoksa elle yazılan açıklama

  @Column({ type: 'decimal', precision: 14, scale: 2 })
  transactionAmount: number; // satış/kira bedeli

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  commissionRate: number; // % olarak, örn 3.00 = %3

  @Column({ type: 'decimal', precision: 14, scale: 2 })
  grossCommission: number; // transactionAmount * commissionRate / 100

  // Paylaşım
  @Column({ type: 'decimal', precision: 5, scale: 2 })
  agentSharePercent: number; // danışmanın brüt komisyondan aldığı pay, örn 50.00 = %50

  @Column({ type: 'decimal', precision: 14, scale: 2 })
  agentGrossShare: number; // grossCommission * agentSharePercent / 100

  // Kesintiler (danışman payından düşülür)
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  withholdingTaxPercent: number; // stopaj %

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  vatPercent: number; // KDV %

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  penaltyAmount: number; // ceza, sabit tutar

  // Sonuç
  @Column({ type: 'decimal', precision: 14, scale: 2 })
  netPayable: number; // agentGrossShare - stopaj - kdv - ceza

  // Hakediş takvimi
  @Column({ type: 'date' })
  dueDate: string;

  @Column({ type: 'varchar', default: CommissionStatus.PENDING })
  status: CommissionStatus;

  // Durum en son ne zaman degisti (bildirim zili icin kullanilir - orn. "onaylandi" ani)
  @Column({ type: 'timestamp', nullable: true })
  statusChangedAt: Date | null;

  @Column({ type: 'varchar', nullable: true })
  notes: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
