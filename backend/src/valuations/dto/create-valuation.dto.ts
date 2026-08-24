import { IsEnum, IsNotEmpty, IsNumber, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';
import { PropertyGroup } from '../valuation.entity';

export class CreateValuationDto {
  @IsOptional()
  @IsUUID()
  propertyId?: string;

  @IsEnum(PropertyGroup)
  propertyGroup: PropertyGroup;

  @IsNotEmpty()
  @IsString()
  propertyType: string;

  @IsNotEmpty()
  @IsString()
  subjectTitle: string;

  @IsNotEmpty()
  @IsString()
  subjectProvince: string;

  @IsNotEmpty()
  @IsString()
  subjectDistrict: string;

  @IsOptional()
  @IsString()
  subjectNeighborhood?: string;

  @IsOptional()
  @IsString()
  subjectAddressDetail?: string;

  @IsNumber()
  subjectAreaM2: number;

  @IsOptional()
  @IsString()
  subjectNotes?: string;

  @IsOptional()
  @IsObject()
  groupData?: Record<string, any>;

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
}
