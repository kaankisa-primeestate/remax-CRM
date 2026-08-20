import { IsEnum, IsOptional, IsString, IsUUID, IsNumber, IsBoolean, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { TransactionStage, OfferStatus } from '../transaction.entity';

export class DeedChecklistItemDto {
  @IsString()
  key: string;

  @IsString()
  label: string;

  @IsBoolean()
  completed: boolean;
}

export class CreateTransactionDto {
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsOptional()
  @IsString()
  externalCustomerLabel?: string;

  @IsOptional()
  @IsUUID()
  propertyId?: string;

  @IsOptional()
  @IsString()
  externalPropertyLabel?: string;

  @IsOptional()
  @IsEnum(TransactionStage)
  stage?: TransactionStage;

  // Gösterim
  @IsOptional()
  @IsString()
  showingDate?: string;

  @IsOptional()
  @IsString()
  showingNote?: string;

  @IsOptional()
  @IsBoolean()
  showingFormCreated?: boolean;

  // Teklif
  @IsOptional()
  @IsNumber()
  offerAmount?: number;

  @IsOptional()
  @IsString()
  offerValidityDate?: string;

  @IsOptional()
  @IsEnum(OfferStatus)
  offerStatus?: OfferStatus;

  @IsOptional()
  @IsString()
  offerNote?: string;

  @IsOptional()
  @IsNumber()
  depositAmount?: number;

  @IsOptional()
  @IsString()
  depositDate?: string;

  // Tapu Kontrol Listesi
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DeedChecklistItemDto)
  deedChecklist?: DeedChecklistItemDto[];

  // Komisyon
  @IsOptional()
  @IsNumber()
  totalCommissionAmount?: number;

  @IsOptional()
  @IsNumber()
  agentCommissionAmount?: number;

  @IsOptional()
  @IsNumber()
  officeCommissionAmount?: number;
}
