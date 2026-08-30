import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { PublicDisclosureService } from './public-disclosure.service';

// KRITIK: bu controller'a BILINCLI OLARAK @UseGuards(JwtAuthGuard)
// KONMADI -- musteri, hesabi olmadan telefonundan linke tiklayip
// buraya erisecek. Guvenlik, giris yapmak yerine token'in KENDISININ
// tahmin edilemez (uuid) ve TEK KULLANIMLIK olmasindan geliyor.
@Controller('public/disclosure')
export class PublicDisclosureController {
  constructor(private readonly publicDisclosureService: PublicDisclosureService) {}

  @Get(':token')
  getForSigning(@Param('token') token: string) {
    return this.publicDisclosureService.getForSigning(token);
  }

  @Post(':token/sign')
  sign(
    @Param('token') token: string,
    @Body() dto: { signatureImage?: string; signedName?: string; method: 'draw' | 'type' },
    @Req() req: any,
  ) {
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || 'bilinmiyor';
    return this.publicDisclosureService.sign(token, dto, ip);
  }
}
