import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { AccountingPartyBalanceDirection } from '../accounting-party.entity';

export class CreateAccountingPartyDto {
  @IsIn(['partner', 'customer', 'vendor', 'other'])
  type: string;

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
  @MaxLength(40)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  taxId?: string;

  @IsIn(['TRY', 'USD', 'EUR'])
  currency: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(999999999999)
  openingBalance?: number;

  @IsOptional()
  @IsIn([AccountingPartyBalanceDirection.RECEIVABLE, AccountingPartyBalanceDirection.PAYABLE])
  openingBalanceDirection?: AccountingPartyBalanceDirection;
}
