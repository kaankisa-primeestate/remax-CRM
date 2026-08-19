import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { CompType } from '../valuation-comp.entity';

// Otomatik eslenen bir comp'un fiyat/alan gibi bilgilerini danisman elle
// duzeltmek isterse kullanilir -- tum alanlar opsiyonel (kismi guncelleme).
export class UpdateCompDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  district?: string;

  @IsOptional()
  @IsString()
  neighborhood?: string;

  @IsOptional()
  @IsNumber()
  areaM2?: number;

  @IsOptional()
  @IsString()
  rooms?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsEnum(CompType)
  compType?: CompType;

  @IsOptional()
  @IsString()
  transactionDate?: string;

  @IsOptional()
  @IsString()
  sourceNote?: string;

  @IsOptional()
  @IsNumber()
  adjustmentAmount?: number;

  @IsOptional()
  @IsString()
  adjustmentReason?: string;

  @IsOptional()
  @IsBoolean()
  includedInAnalysis?: boolean;
}
