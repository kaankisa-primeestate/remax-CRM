import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum AccountingAuditAction {
  CREATE = 'create',
  CORRECT = 'correct',
  VOID = 'void',
  COLLECT = 'collect',
  PAY = 'pay',
}

@Entity('accounting_audit_logs')
@Index(['entityType', 'entityId', 'createdAt'])
@Index(['createdBy', 'createdAt'])
export class AccountingAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 60 })
  entityType: string;

  @Column({ type: 'uuid' })
  entityId: string;

  @Column({ type: 'enum', enum: AccountingAuditAction })
  action: AccountingAuditAction;

  @Column({ type: 'uuid', nullable: true })
  relatedEntityId: string | null;

  @Column({ type: 'uuid', nullable: true })
  createdBy: string | null;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @Column({ type: 'jsonb', nullable: true })
  beforeData: Record<string, any> | null;

  @Column({ type: 'jsonb', nullable: true })
  afterData: Record<string, any> | null;

  @CreateDateColumn()
  createdAt: Date;
}
