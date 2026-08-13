import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user.entity';
import { CurrentUser, CurrentUserPayload } from '../auth/current-user.decorator';

// Bildirim zili: sadece Broker erisebilir (danismanlarin islemlerini takip eder)
@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // GET /api/notifications — son islemler + okunmamis sayisi
  @Get()
  @Roles(UserRole.BROKER)
  getRecentActivity(@CurrentUser() user: CurrentUserPayload) {
    return this.notificationsService.getRecentActivity(user.userId);
  }

  // POST /api/notifications/mark-seen — zili actiginda okunmamis sayisini sifirlar
  @Post('mark-seen')
  @Roles(UserRole.BROKER)
  async markSeen(@CurrentUser() user: CurrentUserPayload) {
    await this.notificationsService.markSeen(user.userId);
    return { success: true };
  }
}
