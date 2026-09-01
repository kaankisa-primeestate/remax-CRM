import { IsEmail, IsString, MinLength } from 'class-validator';

export class CreateBrokerDto {
  @IsString()
  name: string;

  @IsEmail({}, { message: 'Geçerli bir e-posta adresi girin' })
  email: string;

  @IsString()
  @MinLength(6, { message: 'Şifre en az 6 karakter olmalıdır' })
  password: string;
}
