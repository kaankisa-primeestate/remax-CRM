import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CreateAgentDto {
  @IsString()
  @IsNotEmpty({ message: 'Ad Soyad zorunludur' })
  name: string;

  @IsEmail({}, { message: 'Geçerli bir e-posta adresi girin' })
  email: string;

  @IsString()
  @MinLength(6, { message: 'Şifre en az 6 karakter olmalıdır' })
  password: string;
}
