import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

@Entity('accounting_reset_logs')
@Unique(['scope'])
@Index(['createdBy', 'createdAt'])
export class AccountingResetLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 80 })
  scope: string;

  @Column({ type: 'uuid', nullable: true })
  createdBy: string | null;

  @Column({ type: 'text' })
  reason: string;

  @Column({ type: 'varchar', length: 80 })
  confirmation: string;

  @Column({ type: 'jsonb' })
  counts: Record<string, number>;

  @Column({ type: 'jsonb' })
  snapshot: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;
}
