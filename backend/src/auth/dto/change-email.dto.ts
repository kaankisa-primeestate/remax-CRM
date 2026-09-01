import { IsEmail, IsString } from 'class-validator';

export class ChangeEmailDto {
  @IsString()
  currentPassword: string;

  @IsEmail({}, { message: 'Geçerli bir e-posta adresi girin' })
  newEmail: string;
}
