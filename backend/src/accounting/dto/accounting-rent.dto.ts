import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';

export class GenerateAccountingRentsDto {
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/)
  period: string;

  @IsIn(['TRY', 'USD', 'EUR'])
  currency: string;
}

export class SettleAccountingRentDto {
  @IsUUID()
  accountId: string;

  @IsDateString()
  date: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
