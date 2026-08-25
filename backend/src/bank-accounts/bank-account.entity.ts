import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

// Ofisin PARA HESAPLARI -- sadece banka degil, kasa (nakit) ve kredi
// karti da dahil. Daha once sadece "banka hesabi" varmis gibi
// davranilmisti (bankName ZORUNLU alandi) -- bu, gercek bir isletmenin
// mutlaka sahip oldugu nakit kasasini ve kredi kartini temsil etmeyi
// IMKANSIZ kiliyordu (canli kullanimda tespit edildi, kritik bulgu).
export enum AccountType {
  BANK = 'bank',
  CASH = 'cash',
  CREDIT_CARD = 'credit_card',
}

// Bakiye ayri bir kolonda TUTULMAZ -- her zaman ilgili BankTransaction
// kayitlarindan (giris - cikis) canli hesaplanir, boylece hicbir zaman
// senkron kaymasi olmaz.
@Entity('bank_accounts')
export class BankAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: AccountType, default: AccountType.BANK })
  type: AccountType;

  // Kasa (CASH) icin banka adi anlamsizdir, bu yuzden OPSIYONEL --
  // sadece Banka/Kredi Karti turlerinde anlamli.
  @Column({ type: 'varchar', nullable: true })
  bankName: string | null;

  @Column()
  accountName: string; // orn. "Ana Hesap", "Ofis Kasası", "Şirket Kredi Kartı"

  @Column({ type: 'varchar', nullable: true })
  iban: string | null;

  // Coklu para birimi destegi: her hesabin TEK bir ana para birimi olur
  // (orn. bir TL hesabi, ayri bir USD hesabi). Hareket bazli kur donusumu
  // (farkli birimde odeme yapip TL karsiligini otomatik hesaplama) ileriki
  // bir asamada eklenebilir -- simdilik hesap seviyesinde ayrim yeterli.
  @Column({ type: 'varchar', default: 'TRY' })
  currency: string; // 'TRY' | 'USD' | 'EUR'

  // Hesaplar hic silinmez, sadece pasiflestirilir (muhasebe kaydi kaybolmasin diye)
  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
