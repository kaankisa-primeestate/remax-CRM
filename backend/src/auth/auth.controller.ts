import { Body, Controller, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

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
}
