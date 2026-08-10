import { Controller, Get, Param } from '@nestjs/common';
import { PortfoliosService } from './portfolios.service';

// DIKKAT: Bu controller'da @UseGuards(JwtAuthGuard) YOK, yani giris
// yapmadan herkes erisebilir. Sadece findOnePublic() cagirilir, o da
// zaten sadece guvenli alanlari dondurur.
@Controller('public/properties')
export class PublicPortfoliosController {
  constructor(private readonly portfoliosService: PortfoliosService) {}

  @Get(':id')
  findOnePublic(@Param('id') id: string) {
    return this.portfoliosService.findOnePublic(id);
  }
}
