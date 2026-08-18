import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

// "Piyasa Deger Analizi" (KPA -- Karsilastirmali Piyasa Analizi).
//
// ONEMLI HUKUKI NOT: Bu, Turkiye'de SPK lisansli Gayrimenkul Degerleme
// Uzmanlarinin duzenledigi resmi "Gayrimenkul Degerleme Raporu" ILE AYNI
// SEY DEGILDIR ve ASLA oyle sunulmamalidir -- o rapor sadece lisansli
// eksperler tarafindan duzenlenebilir, SPK mevzuati bir kisinin ayni anda
// hem lisansli eksper hem emlak danismani olmasini yasaklar (cikar
// catismasi). Bu arac, danismanin KENDI piyasa gozlemine ve karsilastirmali
// verilere dayanan GAYRI RESMI bir fiyat analizidir -- ABD'deki "CMA
// (Comparative Market Analysis)" kavraminin Turkce karsiligi. Uretilen
// her PDF raporda bu ayrim acikca belirtilir (bkz. valuations.service.ts
// generatePdf metodu).
export enum ValuationStatus {
  DRAFT = 'draft',
  COMPLETED = 'completed',
}

@Entity('property_valuations')
export class PropertyValuation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Mevcut bir portfoyle iliskilendirilebilir (opsiyonel) -- ya da bir
  // danisman henuz sisteme eklenmemis, potansiyel bir portfoy icin de
  // (orn. bir satici adayini ikna etmek icin) bu araci kullanabilir.
  @Column({ type: 'uuid', nullable: true })
  propertyId: string | null;

  @Column({ type: 'uuid' })
  agentId: string;

  // --- Degerlemesi yapilan mulkun (subject) anlik goruntusu ---
  // propertyId verilirse bu alanlar o mulkten kopyalanir, ama HER ZAMAN
  // ayri saklanir -- boylece kaynak Property daha sonra silinse/degisse
  // bile analiz kendi icinde tutarli bir "o anki" kayit olarak kalir.
  @Column()
  subjectTitle: string;

  @Column()
  subjectProvince: string;

  @Column()
  subjectDistrict: string;

  @Column({ type: 'varchar', nullable: true })
  subjectNeighborhood: string | null;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  subjectAreaM2: number;

  @Column({ type: 'varchar', nullable: true })
  subjectRooms: string | null;

  @Column({ type: 'int', nullable: true })
  subjectBuildingAge: number | null;

  @Column({ type: 'varchar', nullable: true })
  subjectFloor: string | null;

  @Column({ type: 'varchar', nullable: true })
  subjectNotes: string | null;

  // --- Sonuc ---
  // Otomatik hesaplanmiyor -- danismanin kendi karari, comps listesine
  // bakarak elle girdigi bir aralik (CMA mantigi: nihai fiyat kanaati
  // her zaman danismana aittir, sistem sadece veri saglar).
  @Column({ type: 'numeric', precision: 14, scale: 2, nullable: true })
  estimatedValueMin: number | null;

  @Column({ type: 'numeric', precision: 14, scale: 2, nullable: true })
  estimatedValueMax: number | null;

  @Column({ type: 'varchar', nullable: true })
  conclusionNotes: string | null;

  @Column({ type: 'enum', enum: ValuationStatus, default: ValuationStatus.DRAFT })
  status: ValuationStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
