import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { CurrentUserPayload } from './current-user.decorator';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'dev-secret-degistirin',
    });
  }

  // Token geçerliyse, bu fonksiyonun döndürdüğü değer request.user olarak atanır
  async validate(payload: {
    sub: string;
    role: 'broker' | 'agent';
    name: string;
    email: string;
  }): Promise<CurrentUserPayload> {
    return {
      userId: payload.sub,
      role: payload.role,
      name: payload.name,
      email: payload.email,
    };
  }
}
