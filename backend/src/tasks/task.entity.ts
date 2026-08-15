import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

// Danismanin gunluk yapilacaklar listesi. Bir musteri kaydiyla
// iliskilendirilebilir (opsiyonel) -- orn. "Ahmet Bey'i ara" gorevi
// musteri kartina baglanabilir.
@Entity('tasks')
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  // Son tarih -- opsiyonel, bos birakilabilir (belirsiz sureli gorev)
  @Column({ type: 'date', nullable: true })
  dueDate: string | null;

  @Column({ default: false })
  completed: boolean;

  // Opsiyonel iliski: bu gorev belirli bir musteriyle mi ilgili
  @Column({ type: 'uuid', nullable: true })
  customerId: string | null;

  // Bu gorev hangi danismana ait (Mahremiyet Duvari)
  @Index()
  @Column({ type: 'uuid' })
  agentId: string;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
