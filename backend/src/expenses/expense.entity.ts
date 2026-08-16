import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export enum ExpenseCategory {
  RENT = 'rent', // Kira
  UTILITY = 'utility', // Fatura
  SALARY = 'salary', // Maaş
  MARKETING = 'marketing', // Pazarlama
  SUPPLIES = 'supplies', // Ofis Malzemesi
  OTHER = 'other', // Diğer
}

// Ofis gideri. 'amount', hesaptan GERÇEKTEN cikan (KDV dahil) tutardir --
// bankAccountId doluysa, bu tutar kadar otomatik bir BankTransaction
// (withdrawal) olusturulur, boylece banka bakiyesi hep senkron kalir.
// 'vatRate' sadece bilgi/rapor amaclidir; KDV payi, 'amount' KDV DAHIL
// kabul edilerek geriye donuk hesaplanir (Turkiye'deki yaygin uygulama).
@Entity('expenses')
export class Expense {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: ExpenseCategory })
  category: ExpenseCategory;

  @Column()
  title: string;

  @Column({ type: 'numeric', precision: 14, scale: 2 })
  amount: number;

  @Column({ type: 'numeric', precision: 5, scale: 2, nullable: true })
  vatRate: number | null; // % olarak, orn 20.00 = %20

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'varchar', nullable: true })
  referenceNo: string | null; // fis/fatura no

  @Column({ type: 'uuid', nullable: true })
  bankAccountId: string | null;

  // Bu gideri karsilayan/ilgili danisman (opsiyonel, bilgi amacli --
  // Cari Hesap asamasi kuruldugunda buraya otomatik baglanti eklenecek)
  @Column({ type: 'uuid', nullable: true })
  agentId: string | null;

  // "Sabit Gider" etiketi (orn. kira) -- otomatik tekrar OLUSTURMAZ,
  // sadece raporlarda ayirt etmek icin bir isarettir.
  @Column({ default: false })
  isRecurring: boolean;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
