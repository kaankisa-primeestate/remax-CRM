import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../auth/current-user.decorator';

@Controller('calendar')
@UseGuards(JwtAuthGuard)
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  // GET /api/calendar/events?from=YYYY-MM-DD&to=YYYY-MM-DD -- kisisel
  // takvim, giris yapan kullaniciya ait (Broker dahil, herkes kendi
  // randevu/gorev/vade kayitlarini gorur -- Mahremiyet Duvari korunur).
  @Get('events')
  getEvents(@Query('from') from: string, @Query('to') to: string, @CurrentUser() user: CurrentUserPayload) {
    return this.calendarService.getEvents(user, from, to);
  }
}
