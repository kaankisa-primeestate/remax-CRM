import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Unique } from 'typeorm';

// AnnouncementDismissal ile AYNI mantik, ama duyuru DISINDAKI bildirim
// turleri icin (orn. 'broker_message' -- bir portfoye Broker'in yazdigi
// yorum). Bu tur bildirimler ayri bir tablo/entity'ye sahip olmadigi
// icin (Announcement gibi), bildirimin KENDI id'sini (notifications.service.ts
// icinde uretilen, orn. "broker-message-<uuid>") anahtar olarak kullanir.
//
// - readAt: danisman bildirime tiklayip icerigi gordugunde (orn. ilgili
//   portfoye gittiginde) doldurulur.
// - dismissedAt: danisman zil listesinden bu bildirimi kaldirdiginda
//   doldurulur -- bir daha "okunmamis" olarak gorunmez.
@Entity('notification_dismissals')
@Unique(['notificationKey', 'agentId'])
export class NotificationDismissal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  notificationKey: string;

  @Column({ type: 'uuid' })
  agentId: string;

  @Column({ type: 'timestamp', nullable: true })
  readAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  dismissedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
