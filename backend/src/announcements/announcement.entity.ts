import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

// Broker'dan danismanlara duyuru (toplanti, hatirlatma, haber vb.).
// targetAgentIds bos/null ise TUM danismanlara gonderilmis demektir.
@Entity('announcements')
export class Announcement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'uuid' })
  createdBy: string;

  // null/bos = tum danismanlara; doluysa sadece bu ID'lere sahip danismanlara
  @Column({ type: 'simple-array', nullable: true })
  targetAgentIds: string[] | null;

  // general = normal duyuru, celebration = kutlama mesaji (dogum gunu,
  // satis/kiralama tebrigi vb.) -- frontend'de ozel gorsel efekt icin.
  @Column({ type: 'varchar', default: 'general' })
  type: 'general' | 'celebration';

  @CreateDateColumn()
  createdAt: Date;
}
