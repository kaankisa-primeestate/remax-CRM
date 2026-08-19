import { IsInt, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateValuationDto {
  @IsOptional()
  @IsUUID()
  propertyId?: string;

  // propertyId verilmisse bu alanlar o mulkten otomatik doldurulur (servis
  // katmaninda) -- verilmemisse (henuz sistemde olmayan bir mulk icin)
  // hepsi zorunludur.
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
  @Min(1)
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
}
