import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Interaction } from './interaction.entity';

// Brief 3.1: müşteri tipi (alıcı/satıcı/kiracı/ev sahibi)
export enum CustomerType {
  BUYER = 'buyer', // alıcı
  SELLER = 'seller', // satıcı
  TENANT = 'tenant', // kiracı
  LANDLORD = 'landlord', // ev sahibi
  INVESTOR = 'investor', // yatırımcı
}

@Entity('customers')
export class Customer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Index()
  @Column({ unique: true })
  phone: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  address: string;

  @Column({ type: 'enum', enum: CustomerType })
  type: CustomerType;

  // Bütçe: alıcı/kiracı için üst bütçe, satıcı için beklenti fiyatı
  @Column({ type: 'numeric', precision: 14, scale: 2, nullable: true })
  budget: number;

  @Column({ default: 'TRY' })
  budgetCurrency: string;

  // "Aradığı özellikler" — serbest metin (örn: "3+1, Kadıköy, deniz manzaralı")
  @Column({ type: 'text', nullable: true })
  requirements: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  // --- Otomatik Eşleştirme için Yapılandırılmış Arama Kriterleri ---
  // Sadece alıcı/kiracı için anlamlı (satıcı/ev sahibi için bos kalabilir)
  @Column({ type: 'varchar', nullable: true })
  preferredDistrict: string | null; // Tercih ettigi ilce

  @Column({ type: 'simple-array', nullable: true })
  preferredRooms: string[] | null; // Tercih ettigi oda sayilari, orn: ["2+1","3+1"]

  // true = istiyor, false = istemiyor, null = farketmez
  @Column({ type: 'boolean', nullable: true })
  wantsSeaView: boolean | null;

  @Column({ type: 'boolean', nullable: true })
  wantsNearMetro: boolean | null;

  // --- Hızlı Kayıt akışı için yapılandırılmış alanlar ---
  // "Ne arıyor?" -- Daire / Villa / Arsa / İş Yeri / Diğer
  @Column({ type: 'varchar', nullable: true })
  propertyInterest: string | null;

  // "Nerede?" -- birden fazla bölge secilebilir (chip'ler)
  @Column({ type: 'simple-array', nullable: true })
  preferredDistricts: string[] | null;

  // "Ne zaman alacak?" -- immediate | 1_3_months | 3_6_months | later
  @Column({ type: 'varchar', nullable: true })
  purchaseTimeline: string | null;

  // Surec asamasi (Kanban panosu icin) -- new_contact | active | offer | completed
  // Etiketler (gorunen isimler) sadece frontend'de tutulur, boylece
  // ileride isim degisikligi veri migrasyonu gerektirmez.
  @Column({ type: 'varchar', default: 'new_contact' })
  pipelineStage: string;

  // Mahremiyet Duvarı (brief 1.1): bu müşteri hangi danışmana ait.
  // null ise "atanmamış" demektir (bkz. customers.service.ts).
  @Index()
  @Column({ type: 'varchar', nullable: true })
  agentId: string | null;

  @OneToMany(() => Interaction, (interaction) => interaction.customer, {
    cascade: true,
  })
  interactions: Interaction[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
