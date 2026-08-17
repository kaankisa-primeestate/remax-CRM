import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

// Islem karti "Zaman Akisi" sekmesi icin birikimli, tarihli not gecmisi.
// Tek bir 'notes' metin alani yerine -- her not ayri bir kayit, boylece
// "12 Agu: 9.500.000 teklif etti" gibi bir iletisim gecmisi olusur.
@Entity('transaction_notes')
export class TransactionNote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  transactionId: string;

  @Column({ type: 'text' })
  text: string;

  @Column({ type: 'uuid' })
  authorId: string;

  @Column()
  authorName: string;

  @CreateDateColumn()
  createdAt: Date;
}
