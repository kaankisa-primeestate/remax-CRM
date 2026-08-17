import { IsBoolean, IsEnum, IsOptional, IsNumber, IsString, IsUUID } from 'class-validator';
import { TransactionStage } from '../transaction.entity';

export class CreateTransactionDto {
  // Musteri: ya customerId (sistemde kayitli) ya da externalCustomerLabel
  // (harici, serbest metin) doldurulur -- ikisi de opsiyonel, en az biri
  // servis katmaninda kontrol edilir.
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

  @IsOptional()
  @IsNumber()
  offerAmount?: number;

  @IsOptional()
  @IsNumber()
  depositAmount?: number;

  @IsOptional()
  @IsString()
  depositDate?: string;

  @IsOptional()
  @IsBoolean()
  dealApproved?: boolean;
}
