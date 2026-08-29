import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum TransactionStage {
  LEAD = 'lead', // Talep
  SHOWING = 'showing', // Gösterme
  OFFER = 'offer', // Teklif
  DEED = 'deed', // Tapu
  CLOSED = 'closed', // Kapanış
}

export enum OfferStatus {
  PENDING = 'pending', // Beklemede
  ACCEPTED = 'accepted', // Kabul Edildi
  REJECTED = 'rejected', // Reddedildi
  WITHDRAWN = 'withdrawn', // Geri Çekildi
}

export interface DeedChecklistItem {
  key: string;
  label: string;
  completed: boolean;
}

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  customerId: string | null;

  @Column({ type: 'varchar', nullable: true })
  externalCustomerLabel: string | null;

  @Column({ type: 'uuid', nullable: true })
  propertyId: string | null;

  @Column({ type: 'varchar', nullable: true })
  externalPropertyLabel: string | null;

  @Index()
  @Column({ type: 'uuid' })
  agentId: string;

  @Column({ type: 'enum', enum: TransactionStage, default: TransactionStage.LEAD })
  stage: TransactionStage;

  // --- GÖSTERİM AŞAMASI (7.2) ---
  @Column({ type: 'timestamp', nullable: true })
  showingDate: Date | null;

  @Column({ type: 'text', nullable: true })
  showingNote: string | null;

  @Column({ default: false })
  showingFormCreated: boolean;

  // --- TEKLİF AŞAMASI (7.3) ---
  @Column({ type: 'numeric', precision: 14, scale: 2, nullable: true })
  offerAmount: number | null;

  @Column({ type: 'date', nullable: true })
  offerValidityDate: string | null;

  @Column({ type: 'enum', enum: OfferStatus, default: OfferStatus.PENDING, nullable: true })
  offerStatus: OfferStatus | null;

  @Column({ type: 'text', nullable: true })
  offerNote: string | null;

  // Kaparo
  @Column({ type: 'numeric', precision: 14, scale: 2, nullable: true })
  depositAmount: number | null;

  @Column({ type: 'date', nullable: true })
  depositDate: string | null;

  // --- TAPU KONTROL LİSTESİ (7.4) ---
  @Column({ type: 'jsonb', nullable: true })
  deedChecklist: DeedChecklistItem[] | null;

  // --- KAPANIŞ & KOMİSYON DÖKÜMÜ (7.5) ---
  // GERCEK kapanis satis/kira bedeli -- offerAmount (Teklif asamasindaki
  // tutar) ile KARISTIRILMAMALI, bunlar farkli olabilir (pazarlik sonrasi
  // degisebilir). Bu alan olmadan, Broker onay ekranina girdiginde
  // "Satis/Kira Bedeli" hep 0.00 goruyordu -- KAYIT EDILEN bir yer yoktu.
  @Column({ type: 'numeric', precision: 14, scale: 2, nullable: true })
  closingAmount: number | null;

  @Column({ type: 'numeric', precision: 14, scale: 2, nullable: true })
  totalCommissionAmount: number | null;

  @Column({ type: 'numeric', precision: 14, scale: 2, nullable: true })
  agentCommissionAmount: number | null;

  @Column({ type: 'numeric', precision: 14, scale: 2, nullable: true })
  officeCommissionAmount: number | null;

  @Column({ type: 'timestamp', nullable: true })
  stageChangedAt: Date | null;

  // Broker Onayı
  @Column({ default: false })
  dealApproved: boolean;

  @Column({ type: 'timestamp', nullable: true })
  dealApprovedAt: Date | null;

  // --- İşbirlikli Satış ---
  @Column({ type: 'uuid', nullable: true })
  collaboratorAgentId: string | null;

  @Column({ type: 'numeric', precision: 5, scale: 2, nullable: true })
  commissionSplitPercentage: number | null;

  @Column({ default: false })
  splitApprovedByOwner: boolean;

  @Column({ default: false })
  splitApprovedByCollaborator: boolean;

  @Column({ type: 'timestamp', nullable: true })
  splitFinalizedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
