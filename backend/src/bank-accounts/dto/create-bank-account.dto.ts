import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateBankAccountDto {
  @IsNotEmpty()
  @IsString()
  bankName: string;

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
