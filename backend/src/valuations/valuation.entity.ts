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
// SEY DEGILDIR ve ASLA oyle sunulmamalidir. Bu arac, danismanin KENDI
// piyasa gozlemine dayanan GAYRI RESMI bir fiyat analizidir (ABD'deki
// "CMA" kavraminin karsiligi). Her PDF raporda bu ayrim acikca belirtilir.
//
// TASARIM KARARI: Arastirma sonucu netlesen su gercek -- konut, ticari/
// gelir getiren, ve arazi mulkleri TAMAMEN FARKLI degerleme mantigi
// gerektiriyor (konut: emsal karsilastirma; ticari: kira geliri/cap
// orani; arazi: imar durumu/KAKS). Bunlari 3 ayri tabloya bolmek yerine,
// TEK bir tabloda "groupData" (jsonb) alaninda gruba ozel alanlari
// tutuyoruz -- boylece yeni bir grup/alan eklemek icin migration
// gerekmez, ve tum analizler ayni listede/raporlama akisinda kalir.
export enum ValuationStatus {
  DRAFT = 'draft',
  COMPLETED = 'completed',
}

export enum PropertyGroup {
  RESIDENTIAL = 'residential', // Daire, Villa, Devre Mulk, Yeni Konut Projesi
  COMMERCIAL = 'commercial', // Isyeri (Fabrika dahil), Ofis/Plaza, Otel
  LAND = 'land', // Arsa, Tarla
  MIXED = 'mixed', // Komple Bina
}

// TABLO ADI NOTU: eski (kaldirilan) degerleme sisteminin tablosuyla ayni
// isim ('property_valuations') kullanilinca, o eski tabloda kalan
// satirlarin YENI zorunlu alanlari (orn. propertyGroup) bos oldugu icin
// TypeORM'un synchronize:true semasi canli ortamda BASARISIZ oluyordu
// (deploy "Exited with status 1" ile cokuyordu, tespit edildi). Tamamen
// YENI, hicbir eski veriyle CAKISMAYAN bir tablo adi kullaniyoruz.
@Entity('kpa_valuations')
export class PropertyValuation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Mevcut bir portfoyle iliskilendirilebilir (opsiyonel) -- ya da
  // danisman henuz sisteme eklenmemis, harici bir mulk icin de bu araci
  // kullanabilir (orn. henuz portfoye eklenmemis bir satici adayi icin).
  @Column({ type: 'uuid', nullable: true })
  propertyId: string | null;

  @Column({ type: 'uuid' })
  agentId: string;

  @Column({ type: 'enum', enum: PropertyGroup })
  propertyGroup: PropertyGroup;

  // Sistemdeki PropertyType degeriyle ayni sozluk (apartment/villa/land/
  // field/commercial/office/hotel/building/timeshare/project) -- raporda
  // "Daire" / "Fabrika" gibi dogru basligi gostermek icin.
  @Column({ type: 'varchar' })
  propertyType: string;

  // --- Mulkun (subject) anlik goruntusu ---
  // propertyId verilirse bu alanlar o mulkten kopyalanir, ama HER ZAMAN
  // ayri saklanir -- kaynak Property daha sonra silinse/degisse bile
  // analiz kendi icinde tutarli bir "o anki" kayit olarak kalir.
  @Column()
  subjectTitle: string;

  @Column()
  subjectProvince: string;

  @Column()
  subjectDistrict: string;

  @Column({ type: 'varchar', nullable: true })
  subjectNeighborhood: string | null;

  @Column({ type: 'varchar', nullable: true })
  subjectAddressDetail: string | null; // Sokak, apartman adi, daire no vb.

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  subjectAreaM2: number;

  @Column({ type: 'varchar', nullable: true })
  subjectNotes: string | null;

  // Gruba OZEL alanlar -- konut icin {rooms, buildingAge, floor,
  // totalFloors, heatingType, view, hasParking, hasElevator}; ticari icin
  // {monthlyRent, occupancyRate, capRate, tenantInfo}; arazi icin
  // {zoningStatus, kaks, taks, roadFrontage, topography, irrigationStatus,
  // cropInfo}; karma icin ikisinin birlesimi. Frontend, propertyGroup'a
  // gore hangi alanlari gosterecegini/duzenleyecegini kendi bilir.
  @Column({ type: 'jsonb', nullable: true })
  groupData: Record<string, any> | null;

  // --- Tapu Bilgileri ve Cevre Notlari ---
  // OTOMATIK CEKILMEZ (TKGM/Sahibinden acik API sunmuyor) -- danisman
  // kendi arastirmasindan elle doldurur, amac raporun zengin gorunmesi.
  @Column({ type: 'varchar', nullable: true })
  subjectParcelNo: string | null;

  @Column({ type: 'varchar', nullable: true })
  subjectLandShare: string | null;

  @Column({ type: 'varchar', nullable: true })
  subjectDeedType: string | null;

  @Column({ type: 'varchar', nullable: true })
  subjectEnvironmentNotes: string | null;

  // --- SWOT ---
  @Column({ type: 'text', nullable: true })
  swotStrengths: string | null;

  @Column({ type: 'text', nullable: true })
  swotWeaknesses: string | null;

  @Column({ type: 'text', nullable: true })
  swotOpportunities: string | null;

  @Column({ type: 'text', nullable: true })
  swotThreats: string | null;

  // --- Sonuc ---
  // Emsallerden ORTALAMA bir baslangic degeri otomatik hesaplanip bu
  // alanlara ONERI olarak yazilir (frontend tarafinda) -- ama HER ZAMAN
  // danisman tarafindan degistirilebilir, sistem kesin bir hukum vermez.
  @Column({ type: 'numeric', precision: 14, scale: 2, nullable: true })
  estimatedValueMin: number | null;

  @Column({ type: 'numeric', precision: 14, scale: 2, nullable: true })
  estimatedValueTarget: number | null;

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
