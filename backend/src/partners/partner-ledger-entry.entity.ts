import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Partner } from './partner.entity';

// Danisman Cari Hesabi'ndaki (AgentLedgerAdjustment) ayni desen -- ama
// Partner icin. Bakiye HIC SAKLANMAZ, her zaman bu hareketlerden canli
// hesaplanir (sistemin genel "hicbir bakiye alani saklanmaz" ilkesi).
export enum PartnerLedgerType {
  CREDIT = 'credit', // Ofis ortaga borclu (kar payi, sermaye iadesi vb.)
  DEBIT = 'debit', // Ortak ofise borclu (sermaye cekisi, avans vb.)
}

@Entity('partner_ledger_entries')
export class PartnerLedgerEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Partner, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'partnerId' })
  partner: Partner;

  @Index()
  @Column({ type: 'uuid' })
  partnerId: string;

  @Column({ type: 'enum', enum: PartnerLedgerType })
  type: PartnerLedgerType;

  @Column({ type: 'numeric', precision: 14, scale: 2 })
  amount: number;

  @Column()
  description: string;

  @Column({ type: 'date' })
  date: string;

  // Kar dagitimindan mi geldi, yoksa elle mi eklendi -- ve hangi donem
  // icin (idempotentlik kontrolu icin: ayni donem icin iki kez
  // dagitim yapilmasin diye).
  @Column({ type: 'varchar', nullable: true })
  source: string | null; // 'profit_distribution' | 'manual'

  @Column({ type: 'varchar', nullable: true })
  distributionPeriod: string | null; // 'YYYY-MM', sadece source='profit_distribution' icin

  // Bu hareketin HANGI kasa/banka hesabina isledigi -- CREDIT (ortak para
  // yatirdi) icin hesap ARTAR, DEBIT (ofis ortaga odeme yapti) icin hesap
  // AZALIR. Nullable: distributeProfit ile olusan SADECE BORCLANDIRMA
  // kayitlarinda (henuz fiilen odeme yapilmadigi icin) bos kalir.
  @Column({ type: 'uuid', nullable: true })
  bankAccountId: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
