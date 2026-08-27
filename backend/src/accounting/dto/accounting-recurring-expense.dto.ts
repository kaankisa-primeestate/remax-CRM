import {
  IsDateString,
  IsIn,
  IsInt,
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

export class CreateAccountingRecurringExpenseDto {
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

  @IsInt()
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

export class GenerateAccountingRecurringExpenseDto {
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/)
  period: string;

  @IsIn(['TRY', 'USD', 'EUR'])
  currency: string;
}
