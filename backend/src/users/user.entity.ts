import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

// Brief 1.1: Rol Tabanlı Yetkilendirme — Broker (Admin) ve Danışman (Agent)
export enum UserRole {
  BROKER = 'broker',
  AGENT = 'agent',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  // Şifrenin bcrypt ile hash'lenmiş hâli — düz metin şifre ASLA saklanmaz
  @Column()
  passwordHash: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.AGENT })
  role: UserRole;

  // Bildirim zilini en son ne zaman actigi/gordugu (okunmamis sayaci icin)
  @Column({ type: 'timestamp', nullable: true })
  lastNotificationsSeenAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
