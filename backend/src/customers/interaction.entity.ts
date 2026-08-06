import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Customer } from './customer.entity';

// Brief 3.1: telefon görüşmeleri, yüz yüze toplantılar, mesajlaşmalar, e-postalar
export enum InteractionType {
  CALL = 'call', // telefon görüşmesi
  MEETING = 'meeting', // yüz yüze toplantı
  MESSAGE = 'message', // mesajlaşma (SMS/WhatsApp)
  EMAIL = 'email', // e-posta
}

@Entity('interactions')
export class Interaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Customer, (customer) => customer.interactions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'customerId' })
  customer: Customer;

  @Column()
  customerId: string;

  @Column({ type: 'enum', enum: InteractionType })
  type: InteractionType;

  // Görüşme notları
  @Column({ type: 'text' })
  notes: string;

  // Aksiyon maddeleri (brief: "Görüşme notları ve aksiyon maddeleri eklenebilir")
  @Column({ type: 'text', nullable: true })
  actionItems: string;

  // Görüşmenin gerçekleştiği tarih (kayıt tarihinden farklı olabilir)
  @Column({ type: 'timestamptz' })
  occurredAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
