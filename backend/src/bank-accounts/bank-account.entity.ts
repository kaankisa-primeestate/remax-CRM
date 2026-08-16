import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

// Ofisin banka hesaplari. Bakiye ayri bir kolonda TUTULMAZ -- her zaman
// ilgili BankTransaction kayitlarindan (giris - cikis) canli hesaplanir,
// boylece hicbir zaman senkron kaymasi olmaz.
@Entity('bank_accounts')
export class BankAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  bankName: string; // orn. "İş Bankası"

  @Column()
  accountName: string; // orn. "Ana Hesap", "Kasa"

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
