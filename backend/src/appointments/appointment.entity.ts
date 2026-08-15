import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

// Danismanin randevulari (musteri gorusmesi, ilan gosterimi vb.).
// Basit "ajanda listesi" gorunumu icin tasarlandi -- tarih+saat sirali.
export enum AppointmentType {
  MEETING = 'meeting', // Musteri gorusmesi
  SHOWING = 'showing', // Ilan gosterimi
  OTHER = 'other', // Diger
}

@Entity('appointments')
export class Appointment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'date' })
  date: string;

  // Saat -- "HH:MM" formatinda serbest metin (opsiyonel, tum gun etkinlik icin bos birakilabilir)
  @Column({ type: 'varchar', nullable: true })
  time: string | null;

  @Column({ type: 'enum', enum: AppointmentType, default: AppointmentType.MEETING })
  type: AppointmentType;

  // Opsiyonel iliskiler
  @Column({ type: 'uuid', nullable: true })
  customerId: string | null;

  @Column({ type: 'uuid', nullable: true })
  propertyId: string | null;

  // Bu randevu hangi danismana ait (Mahremiyet Duvari)
  @Index()
  @Column({ type: 'uuid' })
  agentId: string;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ default: false })
  completed: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
