import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateBankAccountDto {
  @IsOptional()
  @IsIn(['bank', 'cash', 'credit_card'])
  type?: string;

  @IsOptional()
  @IsString()
  bankName?: string | null;

  @IsOptional()
  @IsString()
  accountName?: string;

  @IsOptional()
  @IsString()
  iban?: string | null;

  @IsOptional()
  @IsIn(['TRY', 'USD', 'EUR'])
  currency?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
