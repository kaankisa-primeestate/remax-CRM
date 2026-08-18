import { IsBoolean, IsDateString, IsEnum, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { CompanyType, CommissionShareType } from '../user.entity';

// Broker, sonradan (danisman olusturulduktan sonra) bu alanlari
// doldurabilir/duzeltebilir -- HEPSI opsiyonel, cunku eskiden olusturulmus
// danismanlarda bu bilgiler hic girilmemis olabilir.
export class UpdateAgentProfileDto {
  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  birthDate?: string;

  @IsOptional()
  @IsString()
  nationalId?: string;

  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsString()
  taxId?: string;

  @IsOptional()
  @IsString()
  profilePhotoUrl?: string;

  @IsOptional()
  @IsEnum(CompanyType)
  companyType?: CompanyType;

  @IsOptional()
  @IsString()
  taxOffice?: string;

  @IsOptional()
  @IsString()
  mykCertificateNo?: string;

  @IsOptional()
  @IsString()
  realEstateLicenseUrl?: string;

  @IsOptional()
  @IsString()
  officeName?: string;

  @IsOptional()
  @IsEnum(CommissionShareType)
  commissionShareType?: CommissionShareType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  commissionSharePercentage?: number;

  @IsOptional()
  @IsDateString()
  contractStartDate?: string;

  @IsOptional()
  @IsString()
  mentorAgentId?: string;

  @IsOptional()
  @IsBoolean()
  powerStartCompleted?: boolean;

  @IsOptional()
  @IsString()
  powerStartCertificateNo?: string;

  @IsOptional()
  @IsDateString()
  powerStartCertificateDate?: string;
}
