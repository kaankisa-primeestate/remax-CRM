import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { AccountingPartyType } from './accounting-entry.entity';

export enum AccountingPartyBalanceDirection {
  RECEIVABLE = 'receivable',
  PAYABLE = 'payable',
}

@Entity('accounting_parties')
@Unique(['linkedUserId'])
@Index(['type', 'isActive'])
export class AccountingParty {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: AccountingPartyType })
  type: AccountingPartyType;

  @Column({ type: 'varchar' })
  name: string;

  // Danışman cari kartları CRM users kaydına bağlanır; diğer kartlarda null’dır.
  @Column({ type: 'uuid', nullable: true })
  linkedUserId: string | null;

  @Column({ type: 'varchar', nullable: true })
  companyName: string | null;

  @Column({ type: 'varchar', nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', nullable: true })
  taxId: string | null;

  @Column({ type: 'varchar', length: 3, default: 'TRY' })
  currency: string;

  @Column({ type: 'numeric', precision: 14, scale: 2, default: 0 })
  openingBalance: number;

  @Column({ type: 'enum', enum: AccountingPartyBalanceDirection, default: AccountingPartyBalanceDirection.RECEIVABLE })
  openingBalanceDirection: AccountingPartyBalanceDirection;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
