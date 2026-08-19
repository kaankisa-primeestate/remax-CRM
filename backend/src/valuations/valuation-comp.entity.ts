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

// Bir analizde kullanilan karsilastirma (comp) kaydi -- ya kendi
// veritabanimizdan otomatik eslenir, ya da danisman kendi arastirmasindan
// (sahibinden.com, meslektas bilgisi vb.) elle ekler. Otomatik eklenenler
// de dahil TUM alanlar sonradan elle duzeltilebilir.
export enum CompType {
  SOLD = 'sold', // Satildi (kendi kayitlarimizdan kesin fiyat)
  RENTED = 'rented', // Kiralandi
  ACTIVE_LISTING = 'active_listing', // Henuz satilmamis, aktif ilan fiyati
  // (Turkiye'de resmi satis fiyati verisi ABD'deki gibi kamuya acik
  // degil, bu yuzden danismanlar cogunlukla sadece aktif ilan fiyatlarina
  // erisebiliyor -- bu tur karsilastirmalar da gecerli ama farkli
  // agirlikta degerlendirilmesi gerekir, bu yuzden ayri bir tur.)
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

  // Kendi veritabanimizdan geldiyse kaynak portfoye referans (izlenebilirlik icin)
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

  @Column({ type: 'numeric', precision: 14, scale: 2 })
  price: number;

  @Column({ type: 'enum', enum: CompType })
  compType: CompType;

  // Sold/rented ise ne zaman gerceklesti; active_listing ise bos kalir.
  @Column({ type: 'date', nullable: true })
  transactionDate: string | null;

  // 'Kendi veritabanımız' (otomatik) ya da danismanin elle yazdigi kaynak
  // (orn. "sahibinden.com ilanı", "meslektaş bilgisi").
  @Column({ type: 'varchar', nullable: true })
  sourceNote: string | null;

  @Column({ default: false })
  isAutoMatched: boolean;

  // Wireframe'deki "tik ile dahil et/cikar" ozelligi -- danisman bir
  // comp'u SILMEDEN analiz disinda birakabilir (orn. "bu ev cok lüks,
  // hesaba katma" ama veri kaybolmasin, sonra tekrar dahil edebilsin).
  @Column({ default: true })
  includedInAnalysis: boolean;

  // --- Fark Duzeltmesi (Adjustment) ---
  // Bu comp ile subject mulk arasindaki farka gore elle girilen +/- TL
  // tutari (orn. "Havuzu yok, -50.000TL"). adjustedPrice; price+adjustment
  // olarak HER ZAMAN frontend'de anlik hesaplanir, ayrica saklanmaz --
  // tek dogru kaynak (price, adjustmentAmount) ikilisidir, veri
  // tutarsizligi riskini onler.
  @Column({ type: 'numeric', precision: 14, scale: 2, nullable: true, default: 0 })
  adjustmentAmount: number | null;

  @Column({ type: 'varchar', nullable: true })
  adjustmentReason: string | null;

  // Denormalize: kim ekledi -- performans icin kayitla birlikte saklanir.
  @Column()
  addedByName: string;

  @CreateDateColumn()
  createdAt: Date;
}
