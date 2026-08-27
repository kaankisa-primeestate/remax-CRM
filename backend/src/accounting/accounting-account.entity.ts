import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum AccountingAccountType {
  BANK = 'bank',
  CASH = 'cash',
  CREDIT_CARD = 'credit_card',
}

@Entity('accounting_accounts')
@Index(['currency', 'isActive'])
export class AccountingAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: AccountingAccountType })
  type: AccountingAccountType;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar', nullable: true })
  bankName: string | null;

  @Column({ type: 'varchar', nullable: true })
  iban: string | null;

  @Column({ type: 'varchar', length: 3 })
  currency: string;

  // İlk açılış bakiyesi; sonraki bakiye accounting_entries üzerinden hesaplanır.
  @Column({ type: 'numeric', precision: 14, scale: 2, default: 0 })
  openingBalance: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
