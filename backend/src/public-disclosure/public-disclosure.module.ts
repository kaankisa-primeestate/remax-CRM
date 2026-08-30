import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Appointment } from '../appointments/appointment.entity';
import { Customer } from '../customers/customer.entity';
import { Property } from '../portfolios/property.entity';
import { User } from '../users/user.entity';
import { PublicDisclosureService } from './public-disclosure.service';
import { PublicDisclosureController } from './public-disclosure.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Appointment, Customer, Property, User])],
  providers: [PublicDisclosureService],
  controllers: [PublicDisclosureController],
})
export class PublicDisclosureModule {}
