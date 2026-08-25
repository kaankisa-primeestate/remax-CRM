import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateBankAccountDto {
  @IsOptional()
  @IsIn(['bank', 'cash', 'credit_card'])
  type?: string;

  // Kasa (cash) turunde bankName gonderilmeyebilir -- bu yuzden opsiyonel.
  // Banka/Kredi Karti turunde frontend zaten zorunlu tutuyor.
  @IsOptional()
  @IsString()
  bankName?: string;

  @IsNotEmpty()
  @IsString()
  accountName: string;

  @IsOptional()
  @IsString()
  iban?: string;

  @IsOptional()
  @IsIn(['TRY', 'USD', 'EUR'])
  currency?: string;
}
