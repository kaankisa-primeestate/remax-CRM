import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Customer } from './customer.entity';

@Entity('voice_notes')
export class VoiceNote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Customer, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customerId' })
  customer: Customer;

  @Index()
  @Column()
  customerId: string;

  // Cloudinary'e yuklenen ses dosyasinin linki
  @Column()
  url: string;

  @CreateDateColumn()
  createdAt: Date;
}
