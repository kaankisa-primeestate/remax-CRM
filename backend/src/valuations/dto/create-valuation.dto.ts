import { IsIn, IsNotEmpty, IsNumber, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';

// Enum degerlerini entity'den import edip @IsEnum() ile kullanmak yerine
// duz string listesiyle @IsIn() kullaniyoruz -- entity enum'larini
// decorator icinde DEGER olarak referans etmek bu ortamda derleme/runtime
// asamasinda sessizce basarisiz oluyor (alan "taninmayan" sayilip
// forbidNonWhitelisted tarafindan reddediliyor, gercek canli ortamda
// tespit edildi). @IsIn + düz string projedeki diger DTO'larda zaten
// kanitlanmis, guvenli desen.
export class CreateValuationDto {
  @IsOptional()
  @IsUUID()
  propertyId?: string;

  @IsIn(['residential', 'commercial', 'land', 'mixed'])
  propertyGroup: string;

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
