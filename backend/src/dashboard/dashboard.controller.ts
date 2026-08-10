import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user.entity';

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
}
