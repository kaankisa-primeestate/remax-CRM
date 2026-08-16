import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

// Brief 1.1: Rol Tabanlı Yetkilendirme — Broker (Admin) ve Danışman (Agent)
export enum UserRole {
  BROKER = 'broker',
  AGENT = 'agent',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column({ type: 'varchar', nullable: true })
  phone: string | null;

  @Column({ type: 'text', nullable: true })
  address: string | null;

  // Dogum tarihi -- ileride otomatik "dogum gunu kutlama" duyurulari
  // icin de kullanilabilecek (Merkez Ofis / Duyurular ozelligiyle baglantili)
  @Column({ type: 'date', nullable: true })
  birthDate: string | null;

  // TC Kimlik No -- danismanin kendisine ait (sahis kimligi)
  @Column({ type: 'varchar', nullable: true })
  nationalId: string | null;

  // Danisman genelde kendi sirketi (sahis sirketi) uzerinden fatura
  // keser -- Cari Hesap ve komisyon odemelerinin doğru muhataba
  // (sirkete) baglanabilmesi icin bu bilgiler onemli.
  @Column({ type: 'varchar', nullable: true })
  companyName: string | null;

  @Column({ type: 'varchar', nullable: true })
  taxId: string | null; // Vergi Kimlik No

  // Şifrenin bcrypt ile hash'lenmiş hâli — düz metin şifre ASLA saklanmaz
  @Column()
  passwordHash: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.AGENT })
  role: UserRole;

  // Bildirim zilini en son ne zaman actigi/gordugu (okunmamis sayaci icin)
  @Column({ type: 'timestamp', nullable: true })
  lastNotificationsSeenAt: Date | null;

  // Danismanin aylik satis/ciro hedefi (Broker tarafindan belirlenir).
  // Sadece role=agent icin anlamlidir.
  @Column({ type: 'numeric', precision: 14, scale: 2, nullable: true })
  monthlyTarget: number | null;

  // Danismanin ofise odedigi aylik aidat tutari (Broker tarafindan
  // belirlenir). Her ay icin AgentDue kaydi olustururken bu tutar kullanilir.
  @Column({ type: 'numeric', precision: 14, scale: 2, nullable: true })
  monthlyDuesAmount: number | null;

  @CreateDateColumn()
  createdAt: Date;
}
