import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Property } from './property.entity';
import { PortfoliosService } from './portfolios.service';
import { PortfoliosController } from './portfolios.controller';
import { PublicPortfoliosController } from './public-portfolios.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Property])],
  controllers: [PortfoliosController, PublicPortfoliosController],
  providers: [PortfoliosService],
  exports: [PortfoliosService],
})
export class PortfoliosModule {}
