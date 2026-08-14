import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

// Brief 3.2: Satılık/kiralık konut, arsa, tarla, işyeri, devre mülk ve
// diğer gayrimenkul tipleri
export enum PropertyType {
  APARTMENT = 'apartment', // Konut
  LAND = 'land', // Arsa
  FIELD = 'field', // Tarla
  COMMERCIAL = 'commercial', // İşyeri
  TIMESHARE = 'timeshare', // Devre Mülk
  VILLA = 'villa', // Villa
  OFFICE = 'office', // Plaza / Ofis
  BUILDING = 'building', // Komple Bina / Apartman
  PROJECT = 'project', // Yeni Konut Projesi
  HOTEL = 'hotel', // Otel / Turizm Tesisi
}

export enum ListingType {
  SALE = 'sale', // Satılık
  RENT = 'rent', // Kiralık
}

// Brief 3.2: İlan durumu (Aktif/Pasif/Satıldı/Kiralandı)
export enum PropertyStatus {
  ACTIVE = 'active',
  PASSIVE = 'passive',
  SOLD = 'sold',
  RENTED = 'rented',
}

@Entity('properties')
export class Property {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Kısa, tanımlayıcı başlık — örn. "Kadıköy 3+1 Deniz Manzaralı"
  @Column()
  title: string;

  @Column({ type: 'enum', enum: PropertyType })
  propertyType: PropertyType;

  @Column({ type: 'enum', enum: ListingType })
  listingType: ListingType;

  // --- Zorunlu Alanlar (brief 3.2) ---
  @Index()
  @Column()
  province: string; // İl

  @Index()
  @Column()
  district: string; // İlçe

  @Column()
  neighborhood: string; // Mahalle

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  areaM2: number; // Metrekare

  @Column({ type: 'numeric', precision: 14, scale: 2 })
  price: number;

  @Column({ default: 'TRY' })
  priceCurrency: string;

  @Column()
  deedStatus: string; // Tapu durumu (örn. "Kat Mülkiyeti", "Hisseli Tapu")

  @Column({ default: false })
  mortgageEligible: boolean; // Krediye uygunluk

  // --- Konut tipi ilanlar için anlamlı, arsa/tarla için boş kalabilir ---
  @Column({ type: 'varchar', nullable: true })
  rooms: string | null; // Oda sayısı, örn. "3+1"

  @Column({ type: 'int', nullable: true })
  bathrooms: number | null;

  @Column({ type: 'varchar', nullable: true })
  floor: string | null; // Bulunduğu kat

  @Column({ type: 'varchar', nullable: true })
  heatingType: string | null; // Isıtma tipi

  @Column({ type: 'numeric', precision: 10, scale: 2, nullable: true })
  dues: number | null; // Aidat

  // --- Opsiyonel Alanlar (brief 3.2) ---
  @Column({ default: false })
  hasPool: boolean;

  @Column({ default: false })
  hasGym: boolean;

  @Column({ default: false })
  hasSecurity: boolean;

  @Column({ default: false })
  hasParking: boolean;

  // Otomatik eslestirme icin -- musteri "metroya yakin olsun" kriteri girerse kullanilir
  @Column({ default: false })
  nearMetro: boolean;

  @Column({ type: 'varchar', nullable: true })
  view: string | null; // Manzara

  @Column({ type: 'varchar', nullable: true })
  facade: string | null; // Cephe

  @Column({ type: 'int', nullable: true })
  buildingAge: number | null; // Yapı yaşı

  @Column({ type: 'enum', enum: PropertyStatus, default: PropertyStatus.ACTIVE })
  status: PropertyStatus;

  // Durum en son ne zaman degisti (bildirim zili icin kullanilir)
  @Column({ type: 'timestamp', nullable: true })
  statusChangedAt: Date | null;

  // Basit fotoğraf desteği: gerçek dosya yükleme altyapısı (S3/Cloudinary vb.)
  // henüz kurulmadığı için, danışman harici bir görsel linki ekleyebilir.
  // Gerçek "fotoğraf yükleme" mobil uygulama fazında eklenecek.
  @Column({ type: 'simple-array', nullable: true })
  photoUrls: string[] | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;
  // Kategoriye ozel esnek alanlar (extra ozellikler)
  @Column({ type: 'jsonb', nullable: true })
  extraAttributes: Record<string, any> | null;

  // Mahremiyet Duvarı: bu portföy hangi danışmana ait (bkz. customer.entity.ts)
  @Index()
  @Column({ type: 'varchar', nullable: true })
  agentId: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
