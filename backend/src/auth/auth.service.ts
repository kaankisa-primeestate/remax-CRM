import { BadRequestException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import { LoginDto } from './dto/login.dto';

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 saat

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('E-posta veya şifre hatalı');
    }
    if (!user.isActive) {
      throw new ForbiddenException('Bu hesap pasif duruma alınmış. Lütfen Broker ile iletişime geçin.');
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('E-posta veya şifre hatalı');
    }

    const payload = {
      sub: user.id,
      role: user.role,
      name: user.name,
      email: user.email,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }

  // Dunya standardi "Sifremi Unuttum" akisi: kullanici e-postasini girer,
  // sistem (varsa) bir sifirlama linki gonderir. GUVENLIK: kullanicinin
  // gercekten var olup olmadigini disari sizdirmamak icin (email
  // enumeration saldirisi), her durumda AYNI genel mesaj donulur --
  // e-posta kayitli DEGILSE sessizce hicbir sey yapilmaz.
  async forgotPassword(email: string, frontendBaseUrl: string): Promise<{ emailSent: boolean; smtpConfigured: boolean }> {
    const user = await this.usersService.findByEmail(email);
    const smtpConfigured = this.mailService.isConfigured();
    if (!user) {
      return { emailSent: false, smtpConfigured };
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = await bcrypt.hash(rawToken, 10);
    await this.usersService.setResetToken(user.id, tokenHash, new Date(Date.now() + RESET_TOKEN_TTL_MS));

    const resetUrl = `${frontendBaseUrl}/sifre-sifirla?email=${encodeURIComponent(user.email)}&token=${rawToken}`;
    const sent = await this.mailService.sendPasswordResetEmail(user.email, resetUrl, user.name);
    return { emailSent: sent, smtpConfigured };
  }

  async resetPassword(email: string, token: string, newPassword: string): Promise<void> {
    const user = await this.usersService.findByEmail(email);
    // BadRequestException (400) kullaniyoruz -- 401 kullanmak, bu ekrani
    // farkli bir sekmede aktif oturumu olan bir kullanicinin (nadir ama
    // mumkun) oturumunu otomatik sonlandirirdi (bkz. changePassword'deki
    // ayni sinif hata, orada tespit edilip duzeltildi).
    if (!user || !user.resetTokenHash || !user.resetTokenExpiresAt) {
      throw new BadRequestException('Sıfırlama bağlantısı geçersiz veya süresi dolmuş.');
    }
    if (new Date() > new Date(user.resetTokenExpiresAt)) {
      throw new BadRequestException('Sıfırlama bağlantısının süresi dolmuş. Lütfen tekrar talep edin.');
    }
    const tokenMatches = await bcrypt.compare(token, user.resetTokenHash);
    if (!tokenMatches) {
      throw new BadRequestException('Sıfırlama bağlantısı geçersiz.');
    }
    await this.usersService.setPasswordAndClearResetToken(user.id, newPassword);
  }
}
