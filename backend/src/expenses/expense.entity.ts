import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export enum ExpenseCategory {
  RENT = 'rent', // Kira
  UTILITY = 'utility', // Fatura
  SALARY = 'salary', // Maaş
  MARKETING = 'marketing', // Pazarlama
  SUPPLIES = 'supplies', // Ofis Malzemesi
  OTHER = 'other', // Diğer
}

export interface ExpenseChargeback {
  agentId: string;
  amount: number; // Danışmana yansıtılacak net TL tutarı
  percentage?: number | null; // Opsiyonel bilgi amaçlı % oranı
}

@Entity('expenses')
export class Expense {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Eski, SABIT enum'lu kategori alani -- artik yeni giderler icin
  // ZORUNLU DEGIL (nullable), yeni sistem categoryId kullanir. Gecmis
  // kayitlarin veri butunlugu icin sutun SILINMEDI.
  @Column({ type: 'enum', enum: ExpenseCategory, nullable: true })
  category: ExpenseCategory | null;

  // YENI, ESNEK kategori sistemi -- ExpenseCategoryDefinition tablosuna
  // referans. Eski "category" (sabit enum) sutunu ile CAKISMAZ, GERIYE
  // DONUK uyumluluk icin ikisi de duruyor. YENI giderler bunu kullanir,
  // eski giderler otomatik olarak buna baglanir (bkz. expenses.service.ts
  // migrateLegacyCategories metodu).
  @Column({ type: 'uuid', nullable: true })
  categoryId: string | null;

  @Column()
  title: string;

  @Column({ type: 'numeric', precision: 14, scale: 2 })
  amount: number;

  @Column({ type: 'numeric', precision: 5, scale: 2, nullable: true })
  vatRate: number | null;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'varchar', nullable: true })
  referenceNo: string | null;

  @Column({ type: 'uuid', nullable: true })
  bankAccountId: string | null;

  @Column({ type: 'uuid', nullable: true })
  agentId: string | null;

  @Column({ type: 'numeric', precision: 5, scale: 2, nullable: true })
  chargebackPercentage: number | null;

  @Column({ type: 'jsonb', nullable: true })
  chargebacks: ExpenseChargeback[] | null;

  @Column({ type: 'uuid', nullable: true })
  recurringExpenseId: string | null;

  @Column({ default: false })
  isRecurring: boolean;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
