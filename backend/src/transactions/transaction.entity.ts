import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

// Bir musteri + portfoy eslesmesinin gercek bir anlasmaya donusme sureci.
// Musteri Kanban'indaki "pipelineStage" genel ilgi durumunu gosterirken,
// Transaction BELIRLI bir musteri-portfoy ciftinin somut anlasma surecini
// takip eder (Talepler/Kanban'dan farkli, daha somut bir asama).
export enum TransactionStage {
  VIEWING = 'viewing', // Gorusme
  OFFER = 'offer', // Teklif
  CONTRACT = 'contract', // Sozlesme
  DEED = 'deed', // Tapu (tamamlandi)
}

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  customerId: string;

  @Column({ type: 'uuid' })
  propertyId: string;

  // Bu islem hangi danismana ait (Mahremiyet Duvari)
  @Index()
  @Column({ type: 'uuid' })
  agentId: string;

  @Column({ type: 'enum', enum: TransactionStage, default: TransactionStage.VIEWING })
  stage: TransactionStage;

  @Column({ type: 'numeric', precision: 14, scale: 2, nullable: true })
  offerAmount: number | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  // Asama en son ne zaman degisti -- ileride "kac gundur bu asamada
  // bekliyor" gibi bir gorunum icin kullanilabilir.
  @Column({ type: 'timestamp', nullable: true })
  stageChangedAt: Date | null;

  // Tapu Onay Akisi: asama "deed" (Tapu) oldugunda islem otomatik olarak
  // "onay bekliyor" durumuna girer -- SADECE Broker onaylayabilir. Onay
  // sonrasi Komisyonlar sayfasinda on-doldurulmus bir kayit acilir.
  @Column({ default: false })
  dealApproved: boolean;

  @Column({ type: 'timestamp', nullable: true })
  dealApprovedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
