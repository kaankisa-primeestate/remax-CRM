import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { Property } from '../portfolios/property.entity';
import { Customer } from '../customers/customer.entity';
import { Interaction } from '../customers/interaction.entity';
import { Commission } from '../commissions/commission.entity';
import { User } from '../users/user.entity';
import { PropertyComment } from '../property-comments/property-comment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Property, Customer, Interaction, Commission, User, PropertyComment])],
  controllers: [NotificationsController],
  providers: [NotificationsService],
})
export class NotificationsModule {}
