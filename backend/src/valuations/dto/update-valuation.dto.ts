import { PartialType } from '@nestjs/mapped-types';
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { CreateValuationDto } from './create-valuation.dto';
import { ValuationStatus } from '../valuation.entity';

export class UpdateValuationDto extends PartialType(CreateValuationDto) {
  @IsOptional()
  @IsNumber()
  estimatedValueMin?: number;

  @IsOptional()
  @IsNumber()
  estimatedValueTarget?: number;

  @IsOptional()
  @IsNumber()
  estimatedValueMax?: number;

  @IsOptional()
  @IsString()
  conclusionNotes?: string;

  @IsOptional()
  @IsString()
  swotStrengths?: string;

  @IsOptional()
  @IsString()
  swotWeaknesses?: string;

  @IsOptional()
  @IsString()
  swotOpportunities?: string;

  @IsOptional()
  @IsString()
  swotThreats?: string;

  @IsOptional()
  @IsEnum(ValuationStatus)
  status?: ValuationStatus;
}
