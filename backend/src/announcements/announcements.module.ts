import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Announcement } from './announcement.entity';
import { AnnouncementResponse } from './announcement-response.entity';
import { AnnouncementsService } from './announcements.service';
import { AnnouncementsController } from './announcements.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Announcement, AnnouncementResponse])],
  providers: [AnnouncementsService],
  controllers: [AnnouncementsController],
  exports: [AnnouncementsService],
})
export class AnnouncementsModule {}
