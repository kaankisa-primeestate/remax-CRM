import { Controller, Get, Post, UseGuards } from '@nestjs/common';
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
}
