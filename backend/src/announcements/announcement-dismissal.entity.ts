import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Unique } from 'typeorm';

// Bir duyurunun, BELIRLI bir danisman icin "okundu" ve/veya "kapatildi
// (kaldirildi)" durumunu tutar. Bu, Announcement kaydinin KENDISINI
// SILMEZ -- Broker'in genel gorunumu ve diger danismanlarin gorunumu
// ETKILENMEZ, sadece bu danismanin KENDI ekranindan o duyuru kaybolur.
//
// - readAt: danisman duyuruyu ACIP icerigini gordugunde doldurulur.
// - dismissedAt: danisman "Sil" dediginde doldurulur -- artik bu
//   danismanin aktif listesinde/zilinde GORUNMEZ (yeni bir duyuru
//   gelirse o ayri bir kayittir, tekrar aktif olarak gorunur).
@Entity('announcement_dismissals')
@Unique(['announcementId', 'agentId'])
export class AnnouncementDismissal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  announcementId: string;

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
