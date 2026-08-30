import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

// Danismanin randevulari (musteri gorusmesi, ilan gosterimi vb.).
// Basit "ajanda listesi" gorunumu icin tasarlandi -- tarih+saat sirali.
export enum AppointmentType {
  MEETING = 'meeting', // Musteri gorusmesi
  SHOWING = 'showing', // Ilan gosterimi
  OTHER = 'other', // Diger
}

@Entity('appointments')
export class Appointment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'date' })
  date: string;

  // Saat -- "HH:MM" formatinda serbest metin (opsiyonel, tum gun etkinlik icin bos birakilabilir)
  @Column({ type: 'varchar', nullable: true })
  time: string | null;

  @Column({ type: 'enum', enum: AppointmentType, default: AppointmentType.MEETING })
  type: AppointmentType;

  // Opsiyonel iliskiler
  @Column({ type: 'uuid', nullable: true })
  customerId: string | null;

  @Column({ type: 'uuid', nullable: true })
  propertyId: string | null;

  // Bu randevu hangi danismana ait (Mahremiyet Duvari)
  @Index()
  @Column({ type: 'uuid' })
  agentId: string;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ default: false })
  completed: boolean;

  // Yer Gosterme Beyani: "Ilan Gosterimi" turundeki randevularda,
  // musteriye gosterim yapildigina dair beyan/onay alindi mi -- hukuki
  // koruma icin (danismanin komisyon hakkini kanitlayan kayit).
  @Column({ default: false })
  disclosureAccepted: boolean;

  // Beyan TAM OLARAK ne zaman onaylandi -- Broker Sozlesmeler & Tapu
  // sayfasinda siralama/bildirim icin kullanilir. updatedAt'tan FARKLI
  // olarak, sadece disclosureAccepted false->true gectiginde guncellenir
  // (baslik gibi ilgisiz bir alan degisince yanlislikla tetiklenmez).
  @Column({ type: 'timestamp', nullable: true })
  disclosureAcceptedAt: Date | null;

  // --- DIJITAL IMZA (musterinin KENDI cihazindan imzaladigi link) ---
  // Tahmin edilemez, tek kullanimlik public link anahtari. Bu alan
  // dolduysa musteriye WhatsApp'tan bir imzalama linki gonderilmis
  // demektir; NULL ise henuz hic link uretilmemis.
  @Index({ unique: true, where: '"disclosureToken" IS NOT NULL' })
  @Column({ type: 'uuid', nullable: true })
  disclosureToken: string | null;

  // Musterinin cizdigi imza -- base64 PNG (data:image/png;base64,...).
  @Column({ type: 'text', nullable: true })
  disclosureSignatureImage: string | null;

  // Musteri "adini yazarak" imzaladiysa, yazdigi isim (cizim yerine).
  @Column({ type: 'varchar', nullable: true })
  disclosureSignedName: string | null;

  // 'draw' (cizerek) veya 'type' (yazarak) -- hangi yontemi kullandi.
  @Column({ type: 'varchar', nullable: true })
  disclosureSignatureMethod: 'draw' | 'type' | null;

  // Imzalayanin IP adresi -- ileride bir itiraz olursa ek kanit.
  @Column({ type: 'varchar', nullable: true })
  disclosureSignedIp: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
