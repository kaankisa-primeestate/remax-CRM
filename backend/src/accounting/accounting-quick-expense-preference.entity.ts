import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('accounting_quick_expense_preferences')
@Index(['label'], { unique: true })
export class AccountingQuickExpensePreference {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Kayıt hareketinin kategori adı; açıklama bu isimlendirmeyi etkilemez.
  @Column({ type: 'varchar', length: 160 })
  label: string;

  // Gizlemek yalnızca hızlı seçim listesini etkiler; gerçek hareket korunur.
  @Column({ type: 'boolean', default: false })
  isHidden: boolean;

  @Column({ type: 'uuid', nullable: true })
  createdBy: string | null;

  @Column({ type: 'uuid', nullable: true })
  updatedBy: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
