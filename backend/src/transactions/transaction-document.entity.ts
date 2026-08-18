import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Transaction } from './transaction.entity';

// Islemler > Belgeler sekmesi: sabit bir kontrol listesi (Yer Gosterme
// Formu, Sozlesme, Tapu, Kimlik) + serbest "Diger" turu. Her satir ya
// sadece "tamamlandi" olarak isaretlenebilir (dosya olmadan, orn. fiziksel
// olarak kontrol edildiyse) ya da bir dosya (Cloudinary linki) icerebilir.
// Bir tur icin en son eklenen satir o turun guncel durumunu gosterir --
// eski satirlar gecmis/denetim izi olarak saklanir, silinmez (sadece
// kullanici elle silerse silinir).
export enum TransactionDocType {
  DISCLOSURE = 'disclosure', // Yer Gosterme Formu
  CONTRACT = 'contract', // Sozlesme
  DEED = 'deed', // Tapu
  ID = 'id', // Kimlik
  OTHER = 'other', // Diger (serbest etiketli)
}

@Entity('transaction_documents')
export class TransactionDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Transaction, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'transactionId' })
  transaction: Transaction;

  @Index()
  @Column()
  transactionId: string;

  @Column({ type: 'enum', enum: TransactionDocType })
  docType: TransactionDocType;

  // Sadece docType='other' oldugunda anlamli -- kullanicinin kendi verdigi
  // isim (orn. "Vekaletname", "Ekspertiz Raporu").
  @Column({ type: 'varchar', nullable: true })
  label: string | null;

  @Column({ default: false })
  completed: boolean;

  // Cloudinary'e yuklenen dosyanin linki -- dosyasiz da "tamamlandi"
  // isaretlenebildigi icin nullable.
  @Column({ type: 'varchar', nullable: true })
  fileUrl: string | null;

  @Column({ type: 'varchar', nullable: true })
  fileName: string | null;

  // Denormalize: kim ekledi/guncelledi -- performans icin kayitla birlikte saklanir.
  @Column()
  updatedByName: string;

  @CreateDateColumn()
  createdAt: Date;
}
