import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

// Bir banka hesabindaki tek bir hareket (giris/cikis). Ileride Komisyon
// odemeleri, Gider odemeleri ve Ortak hareketleri de "source"/"sourceId"
// alanlariyla buraya baglanabilir -- simdilik manuel hareketler icin.
export enum BankTransactionType {
  DEPOSIT = 'deposit', // Para girisi
  WITHDRAWAL = 'withdrawal', // Para cikisi
}

@Entity('bank_transactions')
export class BankTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  bankAccountId: string;

  @Column({ type: 'enum', enum: BankTransactionType })
  type: BankTransactionType;

  @Column({ type: 'numeric', precision: 14, scale: 2 })
  amount: number;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  // Fis/fatura numarasi (opsiyonel, denetim/eslesme icin)
  @Column({ type: 'varchar', nullable: true })
  referenceNo: string | null;

  // Bu hareket nereden geldi -- 'manual' | 'commission' | 'expense' | 'partner'
  // Ileriki asamalarda otomatik baglanti icin kullanilacak, simdilik 'manual'.
  @Column({ type: 'varchar', default: 'manual' })
  source: string;

  @Column({ type: 'uuid', nullable: true })
  sourceId: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
