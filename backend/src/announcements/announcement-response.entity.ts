import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';

// Bir duyuruya danismanin verdigi yanit (orn. "Toplantiya katilacak misin?").
// Her danisman bir duyuruya EN FAZLA bir kez yanit verir -- tekrar
// yanitlarsa mevcut kayit guncellenir (upsert).
@Entity('announcement_responses')
@Unique(['announcementId', 'agentId'])
export class AnnouncementResponse {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  announcementId: string;

  @Column({ type: 'uuid' })
  agentId: string;

  @Column()
  agentName: string;

  @Column({ type: 'varchar' })
  status: 'yes' | 'no';

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
