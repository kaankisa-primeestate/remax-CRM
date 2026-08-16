import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
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
  // Broker tumunu (+ herkesin yanit ozeti) gorur
  @Get()
  findAll(@CurrentUser() user: CurrentUserPayload) {
    return this.announcementsService.findAllForUser(user);
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

  // DELETE /api/announcements/:id -- Sadece Broker
  @Delete(':id')
  @Roles(UserRole.BROKER)
  async remove(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    await this.announcementsService.remove(id, user);
    return { success: true };
  }
}
