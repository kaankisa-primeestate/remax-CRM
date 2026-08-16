import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Unique,
  Index,
} from 'typeorm';

// Bir danismanin belirli bir ay icin ofise odemesi beklenen aidat kaydi.
// Her (agentId, period) cifti icin EN FAZLA bir kayit olur (Unique) --
// "Bu ayin aidatlarini olustur" butonu, zaten var olan ay icin ikinci
// bir kayit acmaz (idempotent).
@Entity('agent_dues')
@Unique(['agentId', 'period'])
export class AgentDue {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  agentId: string;

  // 'YYYY-MM' formatinda, orn. '2026-08'
  @Column({ type: 'varchar' })
  period: string;

  @Column({ type: 'numeric', precision: 14, scale: 2 })
  expectedAmount: number;

  @Column({ default: false })
  paid: boolean;

  @Column({ type: 'date', nullable: true })
  paidDate: string | null;

  @Column({ type: 'uuid', nullable: true })
  bankAccountId: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
