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

  // Danisman "Broker'a Bildir" dediginde true olur -- Broker'in ana
  // sayfasindaki Aksiyon Merkezi'nde one cikan, cevap/aksiyon bekleyen
  // bir bayrak. resolved=true olunca (Broker "Cozuldu" dedikten sonra)
  // aksiyon merkezinden kaybolur ama kayit (Aktivite Akisi'nda) kalir.
  @Column({ type: 'boolean', default: false })
  isBrokerFlag: boolean;

  @Column({ type: 'boolean', default: false })
  resolved: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
