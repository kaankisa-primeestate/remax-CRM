import { IsDateString, IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export class AddCompDto {
  @IsOptional()
  @IsUUID()
  sourcePropertyId?: string;

  @IsNotEmpty()
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

  @IsOptional()
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsNumber()
  monthlyRent?: number;

  @IsOptional()
  @IsNumber()
  capRate?: number;

  @IsIn(['sold', 'rented', 'active_listing'])
  compType: string;

  @IsOptional()
  @IsDateString()
  transactionDate?: string;

  @IsOptional()
  @IsString()
  sourceNote?: string;
}
