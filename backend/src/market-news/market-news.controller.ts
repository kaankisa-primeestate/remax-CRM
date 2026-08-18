import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MarketNewsService } from './market-news.service';

@Controller('market')
@UseGuards(JwtAuthGuard)
export class MarketNewsController {
  constructor(private readonly marketNewsService: MarketNewsService) {}

  // GET /api/market/real-estate-news
  @Get('real-estate-news')
  getRealEstateNews() {
    return this.marketNewsService.getRealEstateNews();
  }
}
