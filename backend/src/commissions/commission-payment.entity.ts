import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

// Bir komisyonun KISMI (ya da tam) odemesi. Bir komisyona birden fazla
// odeme kaydi eklenebilir -- kalan bakiye = netPayable - tum odemelerin
// toplami (hic bir yerde ayrica saklanmaz, her zaman canli hesaplanir).
@Entity('commission_payments')
export class CommissionPayment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  commissionId: string;

  @Column({ type: 'numeric', precision: 14, scale: 2 })
  amount: number;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'uuid', nullable: true })
  bankAccountId: string | null;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
