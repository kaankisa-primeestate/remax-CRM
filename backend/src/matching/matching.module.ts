import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Property } from '../portfolios/property.entity';
import { Customer } from '../customers/customer.entity';
import { User } from '../users/user.entity';
import { MatchingService } from './matching.service';
import { MatchingController } from './matching.controller';
import { CustomersModule } from '../customers/customers.module';
import { PortfoliosModule } from '../portfolios/portfolios.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Property, Customer, User]),
    CustomersModule,
    PortfoliosModule,
  ],
  controllers: [MatchingController],
  providers: [MatchingService],
})
export class MatchingModule {}
