import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPhoneNumber,
  IsString,
  Min,
} from 'class-validator';
import { CustomerType } from '../customer.entity';

export class CreateCustomerDto {
  @IsString()
  @IsNotEmpty({ message: 'Ad alanı zorunludur' })
  firstName: string;

  @IsString()
  @IsNotEmpty({ message: 'Soyad alanı zorunludur' })
  lastName: string;

  @IsPhoneNumber('TR', { message: 'Geçerli bir telefon numarası girin' })
  phone: string;

  @IsOptional()
  @IsEmail({}, { message: 'Geçerli bir e-posta adresi girin' })
  email?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsEnum(CustomerType, { message: 'Geçerli bir müşteri tipi seçin' })
  type: CustomerType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  budget?: number;

  @IsOptional()
  @IsString()
  budgetCurrency?: string;

  @IsOptional()
  @IsString()
  requirements?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  agentId?: string;
}
