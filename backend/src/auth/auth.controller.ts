import { Body, Controller, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // POST /api/auth/login — herkese açık, JwtAuthGuard uygulanmaz
  // Brute-force koruması: dakikada en fazla 10 deneme/IP -- yanlış şifre
  // denemelerini sınırsız hızda deneyen bir bot/script'i engeller, ama
  // normal bir kullanıcının birkaç kez yanlış girmesini engellemez.
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  // POST /api/auth/forgot-password — herkese açık. Guvenlik geregi,
  // e-posta kayitli olsun ya da olmasin AYNI genel yanit donulur
  // (email enumeration saldirisini onlemek icin).
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    const frontendBaseUrl = process.env.FRONTEND_URL || 'https://remaxbostanci.com';
    const result = await this.authService.forgotPassword(dto.email, frontendBaseUrl);
    return {
      message: 'Eğer bu e-posta adresi sistemde kayıtlıysa, şifre sıfırlama bağlantısı gönderildi.',
      // smtpConfigured bilgisini de donuyoruz -- frontend, e-posta
      // sistemi hic kurulmamissa kullaniciya "Broker ile iletisime gecin"
      // gibi daha net bir yonlendirme yapabilsin.
      smtpConfigured: result.smtpConfigured,
    };
  }

  // POST /api/auth/reset-password — herkese açık, token dogrulamasi ile calisir
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto.email, dto.token, dto.newPassword);
    return { message: 'Şifreniz başarıyla güncellendi. Şimdi giriş yapabilirsiniz.' };
  }
}
