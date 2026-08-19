import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

// Cek/Senet Portfoyu: ofisin elinde bulunan (musteriden alinan) ya da
// ofisin duzenledigi (birine verilen) cek/senetlerin takibi. "Nakit Akis
// Projeksiyonu" ozelligi bu tabloyu kullanacak (vadesi gelen cek/senetler
// tahmini girdi/cikti olarak sayilir).
export enum ChequeNoteType {
  CHEQUE = 'cheque', // Cek
  NOTE = 'note', // Senet
}

// Bizim ALACAGIMIZ (musteriden tahsil edecegimiz) mi, yoksa bizim
// ODEYECEGIMIZ (birine verdigimiz) cek/senet mi -- Nakit Akis
// hesaplamasinda dogru isaretle (+ / -) sayilmasi icin kritik.
export enum ChequeNoteDirection {
  RECEIVABLE = 'receivable', // Alacak (bize odenecek)
  PAYABLE = 'payable', // Borc (bizim odeyecegimiz)
}

export enum ChequeNoteStatus {
  PORTFOLIO = 'portfolio', // Elimizde bekliyor (henuz vadesi gelmedi/islem yapilmadi)
  COLLECTED = 'collected', // Tahsil edildi / odendi
  ENDORSED = 'endorsed', // Ciro edildi (baskasina devredildi)
  BOUNCED = 'bounced', // Karsiliksiz cikti
}

@Entity('cheque_notes')
export class ChequeNote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: ChequeNoteType })
  type: ChequeNoteType;

  @Column({ type: 'enum', enum: ChequeNoteDirection })
  direction: ChequeNoteDirection;

  @Column({ type: 'numeric', precision: 14, scale: 2 })
  amount: number;

  @Column({ type: 'date' })
  dueDate: string;

  // Kesideci (cek/senedi duzenleyen kisi/kurum) -- alacak ise musterinin
  // adi, borc ise bizim kime verdigimiz olabilir (bilgi amacli).
  @Column()
  drawerName: string;

  @Column({ type: 'varchar', nullable: true })
  referenceNo: string | null; // cek/senet no

  @Column({ type: 'enum', enum: ChequeNoteStatus, default: ChequeNoteStatus.PORTFOLIO })
  status: ChequeNoteStatus;

  // Tahsil/odeme yapildiginda hangi banka hesabina isleneceği (islem
  // gerceklestiginde otomatik bir BankTransaction olusturur).
  @Column({ type: 'uuid', nullable: true })
  bankAccountId: string | null;

  @Column({ type: 'varchar', nullable: true })
  notes: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
