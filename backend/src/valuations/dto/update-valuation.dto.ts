import { IsEnum, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';
import { ValuationStatus } from '../valuation.entity';

export class UpdateValuationDto {
  @IsOptional()
  @IsString()
  subjectTitle?: string;

  @IsOptional()
  @IsString()
  subjectProvince?: string;

  @IsOptional()
  @IsString()
  subjectDistrict?: string;

  @IsOptional()
  @IsString()
  subjectNeighborhood?: string;

  @IsOptional()
  @IsNumber()
  subjectAreaM2?: number;

  @IsOptional()
  @IsString()
  subjectRooms?: string;

  @IsOptional()
  @IsInt()
  subjectBuildingAge?: number;

  @IsOptional()
  @IsString()
  subjectFloor?: string;

  @IsOptional()
  @IsString()
  subjectNotes?: string;

  @IsOptional()
  @IsString()
  subjectParcelNo?: string;

  @IsOptional()
  @IsString()
  subjectLandShare?: string;

  @IsOptional()
  @IsString()
  subjectDeedType?: string;

  @IsOptional()
  @IsString()
  subjectEnvironmentNotes?: string;

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
  @IsEnum(ValuationStatus)
  status?: ValuationStatus;
}
