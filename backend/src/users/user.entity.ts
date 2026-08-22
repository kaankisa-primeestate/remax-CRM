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

// Sirket turu -- "Mali ve Yasal Kayitlar" sekmesi
export enum CompanyType {
  SAHIS = 'sahis', // Sahis Sirketi
  LIMITED = 'limited', // Limited Sirketi
}

// Komisyon paylasim tipi -- "Calisma Modeli & Hakedis" sekmesi.
// RAPP: danismanin komisyondan aldigi pay %48, MAXIMUM: %80.
export enum CommissionShareType {
  RAPP = 'rapp',
  MAXIMUM = 'maximum',
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

  // --- Danisman Ekle sablonu: "Kisisel Bilgiler" ---
  // Cloudinary'e yuklenen profil fotografinin linki.
  @Column({ type: 'varchar', nullable: true })
  profilePhotoUrl: string | null;

  // --- "Mali ve Yasal Kayitlar" ---
  @Column({ type: 'enum', enum: CompanyType, nullable: true })
  companyType: CompanyType | null;

  @Column({ type: 'varchar', nullable: true })
  taxOffice: string | null; // Vergi Dairesi

  @Column({ type: 'varchar', nullable: true })
  mykCertificateNo: string | null; // MYK Seviye 5 Belge No

  // Tasinmaz Ticareti Yetki Belgesi -- Cloudinary'e yuklenen dosyanin linki.
  @Column({ type: 'varchar', nullable: true })
  realEstateLicenseUrl: string | null;

  // --- "Calisma Modeli & Hakedis" ---
  // Su an tek ofis var (RE/MAX Bostanci) -- sabit deger olarak saklanir,
  // ileride birden fazla sube acilirsa bu alan gercek bir secim listesine
  // baglanabilir.
  @Column({ type: 'varchar', nullable: true, default: 'RE/MAX Bostancı' })
  officeName: string | null;

  @Column({ type: 'enum', enum: CommissionShareType, nullable: true })
  commissionShareType: CommissionShareType | null;

  // Gercek anlasilan komisyon payi yuzdesi -- RAPP/MAXIMUM birer varsayilan
  // kategori (%48 / %80), ama gercek oran anlasmaya gore farklilik
  // gosterebiliyor (orn. MAXIMUM ama %75). Bu yuzden tip ile ayri, elle
  // duzenlenebilir bir sayisal alan.
  @Column({ type: 'numeric', precision: 5, scale: 2, nullable: true })
  commissionSharePercentage: number | null;

  // Kademeli Prim (Sliding Scale) -- opsiyonel. Doluysa, komisyon
  // olustururken danismanin O YILKI toplam ciro hacmine gore otomatik
  // bir oran ONERISI yapilir (yine de elle degistirilebilir -- CMA
  // mantigindaki gibi, sistem oneri sunar, nihai karar Broker/danismanda
  // kalir). Orn: [{threshold:0,rate:50},{threshold:500000,rate:60}]
  // = "0-500.000 TL arasi %50, 500.000 TL uzeri %60".
  @Column({ type: 'jsonb', nullable: true })
  tierCommissionRules: { threshold: number; rate: number }[] | null;

  @Column({ type: 'date', nullable: true })
  contractStartDate: string | null;

  // Mentor/Koc -- baska bir danismana (User) referans, opsiyonel.
  @Column({ type: 'uuid', nullable: true })
  mentorAgentId: string | null;

  // --- "Akademi & Egitim" ---
  @Column({ default: false })
  powerStartCompleted: boolean;

  @Column({ type: 'varchar', nullable: true })
  powerStartCertificateNo: string | null;

  @Column({ type: 'date', nullable: true })
  powerStartCertificateDate: string | null;

  // Şifrenin bcrypt ile hash'lenmiş hâli — düz metin şifre ASLA saklanmaz
  @Column()
  passwordHash: string;

  // Danisman pasife alindiginda giris yapamaz ama TUM verisi (musteri,
  // portfoy, islem, komisyon gecmisi) korunur -- kalici silmenin
  // yaratacagi veri kaybi riski olmadan "bu artik aktif calismiyor"
  // durumunu isaretlemenin standart, guvenli yolu.
  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  // Sifremi Unuttum akisi: tek kullanimlik, sureli token. Hash'lenerek
  // saklanir (dogrudan token DEGIL) -- boylece veritabani sizarsa bile
  // token'lar kullanilamaz hale gelir (bcrypt ile karsilastirilir).
  @Column({ type: 'varchar', nullable: true })
  resetTokenHash: string | null;

  @Column({ type: 'timestamp', nullable: true })
  resetTokenExpiresAt: Date | null;

  // Sifre EN SON ne zaman degisti -- dunya standardi guvenlik kurali:
  // "sifre degisince, o an baska yerlerde acik kalmis TUM oturumlar
  // otomatik sonlanmali" (bkz. JwtStrategy). Broker'in verdigi gecici
  // sifre, e-postayla sifirlanan sifre, danismanin kendi sectigi sifre
  // -- hangisi EN SON kaydedilirse GECERLI olan odur, bir onceki ANINDA
  // ve OTOMATIK olarak gecersiz hale gelir. Ayni anda "birden fazla
  // gecerli sifre" gibi bir durum sistemde hicbir zaman olusmaz.
  @Column({ type: 'timestamp', nullable: true })
  passwordChangedAt: Date | null;

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
