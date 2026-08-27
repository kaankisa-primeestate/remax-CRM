import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateAccountingCommissionDto {
  @IsUUID()
  agentId: string;

  @IsIn(['sale', 'rent'])
  transactionType: string;

  @IsOptional()
  @IsString()
  propertyTitle?: string;

  @IsDateString()
  date: string;

  // Kapama sırasında elle girilen brüt komisyon tutarı.
  @IsNumber()
  @Min(0.01)
  grossAmount: number;

  @IsIn(['TRY', 'USD', 'EUR'])
  currency: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class SettleAccountingCommissionDto {
  @IsUUID()
  accountId: string;

  @IsDateString()
  date: string;
}
