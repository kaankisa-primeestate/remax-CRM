import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../auth/current-user.decorator';

// Bildirim zili: hem Broker hem Danisman erisebilir -- icerik role gore
// NotificationsService icinde ayristirilir (Broker: onay bekleyen ilanlar
// + ofis aktivitesi; Danisman: kendi ilanlarina gelen Broker mesajlari).
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // GET /api/notifications — son islemler + okunmamis sayisi
  @Get()
  getRecentActivity(@CurrentUser() user: CurrentUserPayload) {
    return this.notificationsService.getRecentActivity(user.userId);
  }

  // POST /api/notifications/mark-seen — zili actiginda okunmamis sayisini sifirlar
  @Post('mark-seen')
  async markSeen(@CurrentUser() user: CurrentUserPayload) {
    await this.notificationsService.markSeen(user.userId);
    return { success: true };
  }

  // POST /api/notifications/:key/read -- duyuru DISINDAKI bir bildirime
  // (orn. broker_message) tiklaninca "okundu" isaretler
  @Post(':key/read')
  async markNotificationRead(@Param('key') key: string, @CurrentUser() user: CurrentUserPayload) {
    await this.notificationsService.markNotificationRead(key, user.userId);
    return { success: true };
  }

  // POST /api/notifications/:key/dismiss -- zil listesinden kalici olarak kaldirir
  @Post(':key/dismiss')
  async dismissNotification(@Param('key') key: string, @CurrentUser() user: CurrentUserPayload) {
    await this.notificationsService.dismissNotification(key, user.userId);
    return { success: true };
  }
}
