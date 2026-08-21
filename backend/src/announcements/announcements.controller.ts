import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AnnouncementsService } from './announcements.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { RespondAnnouncementDto } from './dto/respond-announcement.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user.entity';
import { CurrentUser, CurrentUserPayload } from '../auth/current-user.decorator';

@Controller('announcements')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  // POST /api/announcements -- Sadece Broker
  @Post()
  @Roles(UserRole.BROKER)
  create(@Body() dto: CreateAnnouncementDto, @CurrentUser() user: CurrentUserPayload) {
    return this.announcementsService.create(dto, user);
  }

  // GET /api/announcements -- Danisman kendine gelenleri (+ kendi yaniti),
  // Broker tumunu (+ herkesin yanit ozeti) gorur. ?includeDismissed=true
  // ile danisman KAPATTIGI duyurulari da (gecmis/arsiv gorunumu icin) gorebilir.
  @Get()
  findAll(@CurrentUser() user: CurrentUserPayload, @Query('includeDismissed') includeDismissed?: string) {
    return this.announcementsService.findAllForUser(user, includeDismissed === 'true');
  }

  // POST /api/announcements/:id/read -- danisman duyuruyu actiginda cagrilir
  @Post(':id/read')
  async markRead(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    await this.announcementsService.markRead(id, user);
    return { success: true };
  }

  // POST /api/announcements/:id/dismiss -- danisman "Sil" dedi, SADECE
  // kendi ekranindan kaldirilir (kalici DELETE degildir, bkz. entity)
  @Post(':id/dismiss')
  async dismiss(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    await this.announcementsService.dismiss(id, user);
    return { success: true };
  }

  // POST /api/announcements/:id/respond -- Danismanin "katilacagim/
  // katilamayacagim" gibi yanit vermesi (upsert)
  @Post(':id/respond')
  respond(
    @Param('id') id: string,
    @Body() dto: RespondAnnouncementDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.announcementsService.respond(id, dto, user);
  }

  // GET /api/announcements/:id/read-status -- Sadece Broker, "kim okudu/kapattı" raporu
  @Get(':id/read-status')
  @Roles(UserRole.BROKER)
  getReadStatus(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.announcementsService.getReadStatus(id, user);
  }

  // DELETE /api/announcements/:id -- Sadece Broker
  @Delete(':id')
  @Roles(UserRole.BROKER)
  async remove(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    await this.announcementsService.remove(id, user);
    return { success: true };
  }
}
