import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { PublicDigitalDocumentService } from './public-digital-document.service';

// KRITIK: bilinclli olarak @UseGuards(JwtAuthGuard) KONMADI -- musteri
// hesabi olmadan buraya erisecek. Guvenlik, token'in tahmin edilemez
// (uuid) ve tek kullanimlik olmasindan geliyor.
@Controller('public/document')
export class PublicDigitalDocumentController {
  constructor(private readonly publicDigitalDocumentService: PublicDigitalDocumentService) {}

  @Get(':token')
  getForSigning(@Param('token') token: string) {
    return this.publicDigitalDocumentService.getForSigning(token);
  }

  @Post(':token/sign')
  sign(
    @Param('token') token: string,
    @Body() dto: { signatureImage?: string; signedName?: string; method: 'draw' | 'type' },
    @Req() req: any,
  ) {
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || 'bilinmiyor';
    return this.publicDigitalDocumentService.sign(token, dto, ip);
  }
}
