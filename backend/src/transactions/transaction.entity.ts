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
  LEAD = 'lead', // Talep
  SHOWING = 'showing', // Gosterme
  OFFER = 'offer', // Teklif
  DEED = 'deed', // Tapu (hazirlik asamasi)
  CLOSED = 'closed', // Kapanis (tamamlandi)
}

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Musteri opsiyonel: sistemde kayitli bir musteriye baglanabilir YA DA
  // "harici" (ofis disi) bir musteri icin serbest metin kullanilabilir.
  // Ikisi ayni anda dolu olmaz.
  @Column({ type: 'uuid', nullable: true })
  customerId: string | null;

  @Column({ type: 'varchar', nullable: true })
  externalCustomerLabel: string | null; // orn. "Zeynep Hanim (0555...) - baska ofis"

  // Portfoy da ayni sekilde opsiyonel/harici olabilir (orn. Sahibinden ilani)
  @Column({ type: 'uuid', nullable: true })
  propertyId: string | null;

  @Column({ type: 'varchar', nullable: true })
  externalPropertyLabel: string | null;

  // Bu islem hangi danismana ait (Mahremiyet Duvari)
  @Index()
  @Column({ type: 'uuid' })
  agentId: string;

  @Column({ type: 'enum', enum: TransactionStage, default: TransactionStage.LEAD })
  stage: TransactionStage;

  @Column({ type: 'numeric', precision: 14, scale: 2, nullable: true })
  offerAmount: number | null;

  // Kaparo / depozito
  @Column({ type: 'numeric', precision: 14, scale: 2, nullable: true })
  depositAmount: number | null;

  @Column({ type: 'date', nullable: true })
  depositDate: string | null;

  // Asama en son ne zaman degisti -- "kac gundur bu asamada bekliyor"
  // gorunumu icin (renk kodlu uyari -- sonraki asamada).
  @Column({ type: 'timestamp', nullable: true })
  stageChangedAt: Date | null;

  // Tapu Onay Akisi: asama "closed" (Kapanis) oldugunda islem otomatik
  // olarak "onay bekliyor" durumuna girer -- SADECE Broker onaylayabilir.
  // Onay sonrasi Komisyonlar sayfasinda on-doldurulmus bir kayit acilir,
  // ilgili portfoyun durumu da otomatik "Satildi/Kiralandi" olur.
  @Column({ default: false })
  dealApproved: boolean;

  @Column({ type: 'timestamp', nullable: true })
  dealApprovedAt: Date | null;

  // --- Isbirlikli Satis ---
  // Musteri sahibi danisman ile portfoy sahibi danisman FARKLI oldugunda
  // otomatik olarak devreye girer (islem olusturulurken tespit edilir).
  // "agentId" alani islemi olusturan/yoneten danismani gosterir; bu alan
  // ise ISLEMIN DIGER TARAFINDAKI danismani (isbirlikci) gosterir.
  @Column({ type: 'uuid', nullable: true })
  collaboratorAgentId: string | null;

  // agentId tarafinin komisyon payi (%) -- digeri (collaboratorAgentId)
  // otomatik olarak (100 - bu) alir. Varsayilan 50 (esit paylasim),
  // taraflardan biri degistirebilir (bu durumda iki onay da sifirlanir).
  @Column({ type: 'numeric', precision: 5, scale: 2, nullable: true })
  commissionSplitPercentage: number | null;

  // Iki tarafin da KENDI ekranindan onaylamasi gerekir -- ikisi de true
  // olunca paylasim kesinlesir (splitFinalizedAt doldurulur).
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
