import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { PropertyValuation } from './valuation.entity';

// Bir analizde kullanilan karsilastirma (comp) kaydi. Konut/arazi icin
// 'price' SATIS fiyati anlamina gelir; ticari/gelir grubunda 'price'
// yerine monthlyRent + capRate kullanilir (deger = yillik kira / cap
// orani mantigi) -- ayni tabloda, hangi alanlarin doldurulacagi
// valuation'in propertyGroup'una gore frontend tarafinda belirlenir.
export enum CompType {
  SOLD = 'sold',
  RENTED = 'rented',
  ACTIVE_LISTING = 'active_listing',
}

@Entity('valuation_comps')
export class ValuationComp {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => PropertyValuation, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'valuationId' })
  valuation: PropertyValuation;

  @Index()
  @Column()
  valuationId: string;

  @Column({ type: 'uuid', nullable: true })
  sourcePropertyId: string | null;

  @Column()
  title: string;

  @Column({ type: 'varchar', nullable: true })
  district: string | null;

  @Column({ type: 'varchar', nullable: true })
  neighborhood: string | null;

  @Column({ type: 'numeric', precision: 10, scale: 2, nullable: true })
  areaM2: number | null;

  @Column({ type: 'varchar', nullable: true })
  rooms: string | null;

  @Column({ type: 'numeric', precision: 14, scale: 2, nullable: true })
  price: number | null;

  @Column({ type: 'numeric', precision: 14, scale: 2, nullable: true })
  monthlyRent: number | null;

  @Column({ type: 'numeric', precision: 5, scale: 2, nullable: true })
  capRate: number | null;

  @Column({ type: 'enum', enum: CompType })
  compType: CompType;

  @Column({ type: 'date', nullable: true })
  transactionDate: string | null;

  @Column({ type: 'varchar', nullable: true })
  sourceNote: string | null;

  @Column({ default: false })
  isAutoMatched: boolean;

  @Column({ default: true })
  includedInAnalysis: boolean;

  @Column({ type: 'numeric', precision: 14, scale: 2, nullable: true, default: 0 })
  adjustmentAmount: number | null;

  @Column({ type: 'varchar', nullable: true })
  adjustmentReason: string | null;

  @Column()
  addedByName: string;

  @CreateDateColumn()
  createdAt: Date;
}
