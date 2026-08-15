import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

// Bir portfoy hakkinda Broker <-> Danisman arasindaki yazismalar.
// En cok "Revize Iste" surecinde kullanilir (Broker neden istedigini
// yazar, Danisman elindeki bilgiyle cevap verir), ama herhangi bir
// portfoy hakkinda genel iletisim icin de kullanilabilir.
@Entity('property_comments')
export class PropertyComment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  propertyId: string;

  @Column({ type: 'uuid' })
  authorId: string;

  // Yazani gosterirken tekrar kullanici sorgusu yapmamak icin
  // isim/rol burada da (denormalize) saklanir.
  @Column()
  authorName: string;

  @Column()
  authorRole: string; // 'broker' | 'agent'

  @Column({ type: 'text' })
  message: string;

  @CreateDateColumn()
  createdAt: Date;
}
