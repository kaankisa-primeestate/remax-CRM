import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user.entity';
import { CurrentUser, CurrentUserPayload } from '../auth/current-user.decorator';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  // GET /api/dashboard/summary?from=YYYY-MM-DD&to=YYYY-MM-DD
  // Sadece Broker erisebilir. from/to verilmezse son 7 gun varsayilir.
  @Get('summary')
  @Roles(UserRole.BROKER)
  getSummary(@Query('from') from?: string, @Query('to') to?: string) {
    const toDate = to ? new Date(to) : new Date();
    toDate.setHours(23, 59, 59, 999);

    const fromDate = from ? new Date(from) : new Date(toDate);
    if (!from) {
      fromDate.setDate(fromDate.getDate() - 7);
    }
    fromDate.setHours(0, 0, 0, 0);

    return this.dashboardService.getSummary(fromDate, toDate);
  }

  // GET /api/dashboard/my-target — Danismanin kendi "Bu Ayki Hedefim" karti icin
  @Get('my-target')
  getMyTargetProgress(@CurrentUser() user: CurrentUserPayload) {
    return this.dashboardService.getAgentMonthlyProgress(user.userId);
  }

  // GET /api/dashboard/agent-activity — Broker'in ana sayfasindaki "Genel
  // Aktivite" panosu icin (aksiyon gerektirmeyen, haberdar-olma amacli)
  @Get('agent-activity')
  @Roles(UserRole.BROKER)
  getRecentAgentActivity() {
    return this.dashboardService.getRecentAgentActivity();
  }

  // GET /api/dashboard/leaderboard?period=week|month — hem Broker hem
  // Danisman erisebilir (gamification/motivasyon amacli, tum ofis gorur).
  @Get('leaderboard')
  getLeaderboard(@Query('period') period?: string) {
    const now = new Date();
    const to = new Date(now);
    to.setHours(23, 59, 59, 999);
    const from = new Date(now);
    if (period === 'month') {
      from.setDate(1);
    } else {
      // hafta: Pazartesi baslangicli
      const dayOfWeek = (now.getDay() + 6) % 7;
      from.setDate(now.getDate() - dayOfWeek);
    }
    from.setHours(0, 0, 0, 0);
    return this.dashboardService.getLeaderboard(from, to);
  }
}
