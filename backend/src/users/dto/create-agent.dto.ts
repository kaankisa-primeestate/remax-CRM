import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { CompanyType, CommissionShareType } from '../user.entity';

// HIZLI KAYIT: sadece Ad Soyad, Kurumsal E-posta, Cep Telefonu ve Sifre
// zorunlu -- Broker'in danismani hemen sisteme sokup teslim edebilmesi
// icin (10-15 danisman ayni gun eklenecekse, her biri icin 4 sekmeyi
// eksiksiz doldurmak surec acisindan pratik degildi). Geri kalan TUM
// alanlar (T.C. Kimlik No, Profil Fotografi, Mali/Yasal, Calisma Modeli,
// Akademi) opsiyonel -- Broker daha sonra "Duzenle" ekranindan, ya da
// danismanin kendisi zaman buldukca tamamlar. Veritabani sutunlari zaten
// nullable (bkz. user.entity.ts), bu yuzden bu gevseme veri modelinde
// hicbir degisiklik gerektirmiyor, sadece dogrulama kurali gevsetiliyor.
export class CreateAgentDto {
  // --- Zorunlu (hizli kayit icin) ---
  @IsString()
  @IsNotEmpty({ message: 'Ad Soyad zorunludur' })
  name: string;

  @IsEmail({}, { message: 'Geçerli bir kurumsal e-posta adresi girin' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Cep telefonu zorunludur' })
  phone: string;

  @IsString()
  @MinLength(6, { message: 'Şifre en az 6 karakter olmalıdır' })
  password: string;

  // --- Opsiyonel: Kişisel Bilgiler (geri kalanı) ---
  @IsOptional()
  @IsString()
  @Length(11, 11, { message: 'T.C. Kimlik No 11 haneli olmalıdır' })
  nationalId?: string;

  @IsOptional()
  @IsString()
  profilePhotoUrl?: string;

  // --- Opsiyonel: Mali ve Yasal Kayıtlar ---
  @IsOptional()
  @IsEnum(CompanyType, { message: 'Geçerli bir şirket türü seçin' })
  companyType?: CompanyType;

  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsString()
  taxOffice?: string;

  @IsOptional()
  @IsString()
  taxId?: string;

  @IsOptional()
  @IsString()
  mykCertificateNo?: string;

  @IsOptional()
  @IsString()
  realEstateLicenseUrl?: string;

  // --- Opsiyonel: Çalışma Modeli & Hakediş ---
  @IsOptional()
  @IsString()
  officeName?: string; // sabit deger, formdan otomatik gelir

  @IsOptional()
  @IsEnum(CommissionShareType, { message: 'Geçerli bir komisyon paylaşım tipi seçin' })
  commissionShareType?: CommissionShareType;

  @IsOptional()
  @IsNumber({}, { message: 'Komisyon paylaşım yüzdesi geçerli bir sayı olmalıdır' })
  @Min(0, { message: 'Komisyon paylaşım yüzdesi 0-100 arasında olmalıdır' })
  @Max(100, { message: 'Komisyon paylaşım yüzdesi 0-100 arasında olmalıdır' })
  commissionSharePercentage?: number;

  @IsOptional()
  @IsDateString({}, { message: 'Geçerli bir sözleşme başlangıç tarihi girin' })
  contractStartDate?: string;

  @IsOptional()
  @IsString()
  mentorAgentId?: string;

  @IsOptional()
  @IsNumber({}, { message: 'Aylık aidat tutarı geçerli bir sayı olmalıdır' })
  @Min(0)
  monthlyDuesAmount?: number;

  // --- Opsiyonel: Akademi & Eğitim ---
  @IsOptional()
  @IsBoolean()
  powerStartCompleted?: boolean;

  @IsOptional()
  @IsString()
  powerStartCertificateNo?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Geçerli bir sertifika tarihi girin' })
  powerStartCertificateDate?: string;

  // --- Diğer (mevcut, şablonda yok ama korunuyor) ---
  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  birthDate?: string;
}
