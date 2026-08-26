import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

// Gider Kategorisi TANIMI -- ONCEDEN sabit 6 degerli bir enum'du (Kira,
// Fatura, Maas, Pazarlama, Malzeme, Diger), kullanici YENI bir tur
// ekleyemiyordu (canli kullanimda "boyle muhasebe olmaz" diye tespit
// edildi -- gercek bir isletmenin akaryakit, musteri yemegi gibi
// kategorilere ihtiyaci var, ve bunlar ONCEDEN tahmin edilemez).
//
// Bu entity, o sabit enum'un YERINE gecen, kullanicinin kendi
// yonetebilecegi bir tablo. Expense.category (eski enum sutunu) HALA
// DURUYOR, SILINMEDI -- gecmis kayitlarin veri butunlugu icin. Yeni
// giderler artik Expense.categoryId (bu tabloya referans) kullanir.
@Entity('expense_category_definitions')
export class ExpenseCategoryDefinition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string; // orn. "Kira", "Akaryakıt", "Müşteri Yemeği"

  // Kullanici bir kategoriyi kaldirmak isterse, kalici SILME yerine
  // pasiflestirilir -- gecmis giderler o kategoriye hala bagli kalir,
  // sadece YENI gider eklerken secim listesinde gorunmez.
  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
