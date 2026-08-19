import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

// Ortak (Partner): sisteme giris yapan bir Kullanici (User) DEGILDIR --
// bazen sessiz/pasif yatirimci ortaklar sistemi hic kullanmayabilir. Bu
// yuzden ayri, hafif bir entity -- sadece isim + hisse orani tutar.
@Entity('partners')
export class Partner {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  // Ay sonu kar dagitiminda bu oranda pay alir, orn. 40.00 = %40.
  @Column({ type: 'numeric', precision: 5, scale: 2 })
  sharePercentage: number;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
