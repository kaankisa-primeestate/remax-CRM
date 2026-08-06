import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Interaction } from './interaction.entity';

// Brief 3.1: müşteri tipi (alıcı/satıcı/kiracı/ev sahibi)
export enum CustomerType {
  BUYER = 'buyer', // alıcı
  SELLER = 'seller', // satıcı
  TENANT = 'tenant', // kiracı
  LANDLORD = 'landlord', // ev sahibi
}

@Entity('customers')
export class Customer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Index()
  @Column({ unique: true })
  phone: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  address: string;

  @Column({ type: 'enum', enum: CustomerType })
  type: CustomerType;

  // Bütçe: alıcı/kiracı için üst bütçe, satıcı için beklenti fiyatı
  @Column({ type: 'numeric', precision: 14, scale: 2, nullable: true })
  budget: number;

  @Column({ default: 'TRY' })
  budgetCurrency: string;

  // "Aradığı özellikler" — serbest metin (örn: "3+1, Kadıköy, deniz manzaralı")
  @Column({ type: 'text', nullable: true })
  requirements: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  // Mahremiyet Duvarı (brief 1.1): bu müşteri hangi danışmana ait.
  // Auth modülü henüz yazılmadığı için şimdilik nullable serbest metin/ID
  // olarak tutuyoruz; Auth modülünde gerçek bir User FK'sine bağlanacak.
  @Index()
  @Column({ nullable: true })
  agentId: string;

  @OneToMany(() => Interaction, (interaction) => interaction.customer, {
    cascade: true,
  })
  interactions: Interaction[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
