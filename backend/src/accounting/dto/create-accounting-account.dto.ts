import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateAccountingAccountDto {
  @IsIn(['bank', 'cash', 'credit_card'])
  type: string;

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  bankName?: string;

  @IsOptional()
  @IsString()
  iban?: string;

  @IsIn(['TRY', 'USD', 'EUR'])
  currency: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  openingBalance?: number;
}
