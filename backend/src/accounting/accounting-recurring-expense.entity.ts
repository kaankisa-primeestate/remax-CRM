import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('accounting_recurring_expenses')
@Index(['isActive', 'startPeriod', 'endPeriod'])
@Index(['currency', 'isActive'])
export class AccountingRecurringExpense {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 160 })
  title: string;

  @Column({ type: 'varchar', length: 120 })
  category: string;

  @Column({ type: 'numeric', precision: 14, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 3 })
  currency: string;

  @Column({ type: 'int' })
  dueDay: number;

  @Column({ type: 'varchar', length: 7 })
  startPeriod: string;

  @Column({ type: 'varchar', length: 7, nullable: true })
  endPeriod: string | null;

  @Column({ type: 'uuid' })
  defaultAccountId: string;

  @Column({ type: 'uuid', nullable: true })
  partyId: string | null;

  @Column({ type: 'varchar', nullable: true })
  partyName: string | null;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
