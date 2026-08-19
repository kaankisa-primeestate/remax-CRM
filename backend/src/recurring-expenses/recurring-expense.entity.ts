import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ExpenseCategory } from '../expenses/expense.entity';

// Sabit Gider Sablonu: kira, internet, personel maasi gibi her ay
// TEKRARLANAN giderlerin sablonu. Bu entity KENDISI bir para hareketi
// DEGILDIR -- sadece "her ay bu tarihte, yaklasik bu tutarda bir gider
// bekleniyor" bilgisini tutar. Fiili odeme yapildiginda GERCEK bir
// Expense kaydi olusur (recurringExpenseId ile bu sablona baglanir) --
// boylece tum para hareketleri HER ZAMAN tek bir yerden (Expense) gecer,
// cift muhasebe sistemi olusmaz.
@Entity('recurring_expenses')
export class RecurringExpense {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string; // Orn: Ofis Kirasi, Internet, Koku Makinesi Kiralama

  @Column({ type: 'enum', enum: ExpenseCategory })
  category: ExpenseCategory;

  @Column({ type: 'numeric', precision: 14, scale: 2 })
  defaultAmount: number;

  // Her ayin kacinci gunu vadesi geliyor (1-31). 28'den buyuk degerler
  // icin kisa aylarda (subat vb.) o ayin son gunu kabul edilir.
  @Column({ type: 'int' })
  dueDayOfMonth: number;

  // Odeme yapilirken varsayilan olarak hangi banka hesabindan cikacagi
  // (elle degistirilebilir, sadece varsayilan).
  @Column({ type: 'uuid', nullable: true })
  defaultBankAccountId: string | null;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
