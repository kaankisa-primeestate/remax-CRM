import {
  IsDateString,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { AccountingEntryType, AccountingPartyType } from '../accounting-entry.entity';

export class CorrectAccountingEntryDto {
  @IsEnum(AccountingEntryType)
  type: AccountingEntryType;

  @IsDateString()
  date: string;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsIn(['TRY', 'USD', 'EUR'])
  currency: string;

  @IsOptional()
  @IsUUID()
  accountId?: string;

  @IsOptional()
  @IsUUID()
  counterAccountId?: string;

  @IsNotEmpty()
  @IsString()
  category: string;

  @IsOptional()
  @IsEnum(AccountingPartyType)
  partyType?: AccountingPartyType;

  @IsOptional()
  @IsUUID()
  partyId?: string;

  @IsOptional()
  @IsString()
  partyName?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  referenceNo?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  reason: string;
}
