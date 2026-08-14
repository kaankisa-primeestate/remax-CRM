import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { PropertyType, ListingType, PropertyStatus } from '../property.entity';

export class CreatePropertyDto {
  @IsString()
  @IsNotEmpty({ message: 'Başlık zorunludur' })
  title: string;

  @IsEnum(PropertyType, { message: 'Geçerli bir gayrimenkul tipi seçin' })
  propertyType: PropertyType;

  @IsEnum(ListingType, { message: 'Satılık mı kiralık mı olduğunu belirtin' })
  listingType: ListingType;

  // --- Zorunlu alanlar ---
  @IsString()
  @IsNotEmpty({ message: 'İl zorunludur' })
  province: string;

  @IsString()
  @IsNotEmpty({ message: 'İlçe zorunludur' })
  district: string;

  @IsString()
  @IsNotEmpty({ message: 'Mahalle zorunludur' })
  neighborhood: string;

  @IsNumber()
  @Min(1, { message: 'Metrekare 0’dan büyük olmalıdır' })
  areaM2: number;

  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  @IsString()
  priceCurrency?: string;

  @IsString()
  @IsNotEmpty({ message: 'Tapu durumu zorunludur' })
  deedStatus: string;

  @IsOptional()
  @IsBoolean()
  mortgageEligible?: boolean;

  @IsOptional()
  @IsString()
  contractEndDate?: string;

  // --- Konut tipi alanlar (opsiyonel — arsa/tarla için boş kalabilir) ---
  @IsOptional()
  @IsString()
  rooms?: string;

  @IsOptional()
  @IsInt()
  bathrooms?: number;

  @IsOptional()
  @IsString()
  floor?: string;

  @IsOptional()
  @IsString()
  heatingType?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  dues?: number;

  // --- Opsiyonel ek özellikler ---
  @IsOptional()
  @IsBoolean()
  hasPool?: boolean;

  @IsOptional()
  @IsBoolean()
  hasGym?: boolean;

  @IsOptional()
  @IsBoolean()
  hasSecurity?: boolean;

  @IsOptional()
  @IsBoolean()
  hasParking?: boolean;
  @IsOptional()
  @IsBoolean()
  nearMetro?: boolean;
  @IsOptional()
  @IsObject()
  extraAttributes?: Record<string, any>;

  @IsOptional()
  @IsString()
  view?: string;

  @IsOptional()
  @IsString()
  facade?: string;

  @IsOptional()
  @IsInt()
  buildingAge?: number;

  @IsOptional()
  @IsEnum(PropertyStatus)
  status?: PropertyStatus;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photoUrls?: string[];

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  agentId?: string;
}
