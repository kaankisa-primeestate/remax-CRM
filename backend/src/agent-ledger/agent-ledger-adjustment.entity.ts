import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

// Komisyona bagli olmayan MANUEL cari hareketler (avans, ceza, danismanin
// ofis adina yaptigi masraf vb.). 'credit' = ofis danismana daha COK
// borclanir (bakiye artar, orn. danisman ofis adina masraf yaptiysa);
// 'debit' = ofis danismana daha AZ borclu olur (bakiye azalir, orn. avans
// verildi, ceza kesildi).
export enum LedgerAdjustmentType {
  CREDIT = 'credit',
  DEBIT = 'debit',
}

@Entity('agent_ledger_adjustments')
export class AgentLedgerAdjustment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  agentId: string;

  @Column({ type: 'enum', enum: LedgerAdjustmentType })
  type: LedgerAdjustmentType;

  @Column({ type: 'numeric', precision: 14, scale: 2 })
  amount: number;

  @Column()
  description: string;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'uuid', nullable: true })
  bankAccountId: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
