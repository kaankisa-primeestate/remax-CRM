import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PropertyValuation } from './valuation.entity';
import { ValuationComp } from './valuation-comp.entity';
import { Property } from '../portfolios/property.entity';
import { ValuationsService } from './valuations.service';
import { ValuationsController } from './valuations.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PropertyValuation, ValuationComp, Property])],
  providers: [ValuationsService],
  controllers: [ValuationsController],
})
export class ValuationsModule {}
