import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateAccountingAccountDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  bankName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  iban?: string;
}

export class UpdateAccountingPartyDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  companyName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  taxId?: string;
}

export class UpdateAccountingRecurringExpenseDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  category: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(999999999999)
  amount: number;

  @IsIn(['TRY', 'USD', 'EUR'])
  currency: string;

  @Min(1)
  @Max(31)
  dueDay: number;

  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/)
  startPeriod: string;

  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/)
  endPeriod?: string;

  @IsUUID()
  defaultAccountId: string;

  @IsOptional()
  @IsUUID()
  partyId?: string;
}
