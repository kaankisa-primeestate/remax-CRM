import { Module } from '@nestjs/common';
import { MarketNewsController } from './market-news.controller';
import { MarketNewsService } from './market-news.service';

@Module({
  controllers: [MarketNewsController],
  providers: [MarketNewsService],
})
export class MarketNewsModule {}
