import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../users/users.service';
import { CurrentUserPayload } from './current-user.decorator';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly usersService: UsersService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'dev-secret-degistirin',
    });
  }

  // Token gecerliyse, bu fonksiyonun donduregu deger request.user olarak
  // atanir. EK KONTROL: token OLUSTURULDUKTAN SONRA sifre degismisse
  // (Broker'in acil sifirlamasi, e-postayla sifirlama, ya da kendi
  // "Sifre Degistir" ekrani -- HANGISI olursa olsun), bu eski token
  // ARTIK GECERSIZ sayilir -- dunya standardi guvenlik kurali: "sifre
  // degisince, baska yerlerde acik kalmis TUM oturumlar sonlanmali."
  // Boylece ayni anda "birden fazla gecerli sifre/oturum" durumu
  // sistemde YAPISAL olarak imkansiz hale gelir.
  async validate(payload: {
    sub: string;
    role: 'broker' | 'agent';
    name: string;
    email: string;
    iat: number;
  }): Promise<CurrentUserPayload> {
    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('Kullanıcı bulunamadı');
    }
    if (user.passwordChangedAt && payload.iat * 1000 < user.passwordChangedAt.getTime()) {
      throw new UnauthorizedException('Şifreniz değiştirildi, lütfen tekrar giriş yapın.');
    }
    return {
      userId: payload.sub,
      role: payload.role,
      name: payload.name,
      email: payload.email,
    };
  }
}
