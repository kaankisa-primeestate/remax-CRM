import { IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { CompType } from '../valuation-comp.entity';

export class AddCompDto {
  @IsOptional()
  @IsUUID()
  sourcePropertyId?: string;

  @IsString()
  title: string;

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

  @IsNumber()
  @Min(0)
  price: number;

  @IsEnum(CompType)
  compType: CompType;

  @IsOptional()
  @IsString()
  transactionDate?: string;

  @IsOptional()
  @IsString()
  sourceNote?: string;
}
