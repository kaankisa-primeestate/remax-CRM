import {
  IsUUID,
  IsOptional,
  IsString,
  IsNumber,
  IsIn,
  IsDateString,
  Min,
  Max,
} from 'class-validator';

export class CreateCommissionDto {
  @IsOptional()
  @IsUUID()
  propertyId?: string;

  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsOptional()
  @IsUUID()
  transactionId?: string;

  @IsOptional()
  @IsUUID()
  agentId?: string; // Broker başka bir danışman adına girerken kullanır; Danışman kendi girerse otomatik atanır

  @IsIn(['sale', 'rent'])
  transactionType: string;

  @IsOptional()
  @IsString()
  propertyTitle?: string;

  @IsNumber()
  @Min(0)
  transactionAmount: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  commissionRate: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  agentSharePercent: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  withholdingTaxPercent?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  vatPercent?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  penaltyAmount?: number;

  @IsDateString()
  dueDate: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
