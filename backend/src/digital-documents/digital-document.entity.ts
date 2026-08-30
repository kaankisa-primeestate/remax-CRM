import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

// GENEL dijital belge imzalama sistemi -- Yer Gosterme'deki (Appointment'a
// ozel alanlar) MODELDEN FARKLI OLARAK, bu tablo HERHANGI bir belge turunu
// (Yetkilendirme Sozlesmesi, ileride Kapora Tutanagi, Fiyat Teklifi vb.)
// destekleyecek sekilde GENEL tasarlandi -- yeni bir belge turu eklerken
// yeni bir tablo/entity GEREKMEZ, sadece yeni bir DocumentType ve
// dataSnapshot yapisi yeterlidir.
export enum DigitalDocumentType {
  AUTHORIZATION_SALE = 'authorization_sale', // Satılık Portföy Yetkilendirme Sözleşmesi
}

@Entity('digital_documents')
export class DigitalDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: DigitalDocumentType })
  type: DigitalDocumentType;

  @Column({ type: 'uuid', nullable: true })
  propertyId: string | null;

  @Column({ type: 'uuid', nullable: true })
  customerId: string | null;

  @Index()
  @Column({ type: 'uuid' })
  agentId: string;

  // Musteriye gonderilen linkin tahmin edilemez anahtari.
  @Index({ unique: true })
  @Column({ type: 'uuid' })
  token: string;

  // KRITIK: belge GONDERILDIGI anda, ilgili tum bilgilerin (musteri,
  // mulk, danisman, RE/MAX Prime sabit bilgileri) DONMUS bir kopyasi --
  // sonradan mulk fiyati/bilgisi DEGISSE BILE, imzalanan belgenin
  // ICERIGI SABIT KALIR (hukuki acidan zorunlu).
  @Column({ type: 'jsonb' })
  dataSnapshot: Record<string, any>;

  @Column({ default: false })
  signed: boolean;

  @Column({ type: 'timestamp', nullable: true })
  signedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  signatureImage: string | null;

  @Column({ type: 'varchar', nullable: true })
  signedName: string | null;

  @Column({ type: 'varchar', nullable: true })
  signatureMethod: 'draw' | 'type' | null;

  @Column({ type: 'varchar', nullable: true })
  signedIp: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
