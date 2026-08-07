import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// @UseGuards(JwtAuthGuard) konulan her endpoint için geçerli bir
// "Authorization: Bearer <token>" header'ı zorunlu hâle gelir.
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
