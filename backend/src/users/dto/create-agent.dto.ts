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

// "Yeni Danışman Ekle" şablonundaki ZORUNLU/OPSİYONEL işaretlemeleriyle
// birebir eşleşir. Mevcut (eskiden oluşturulmuş) danışmanların bu alanları
// boş olabilir -- veritabanı sütunları nullable'dır (bkz. user.entity.ts),
// bu doğrulama SADECE yeni danışman oluştururken uygulanır.
export class CreateAgentDto {
  // --- Sekme 1: Kişisel Bilgiler ---
  @IsString()
  @IsNotEmpty({ message: 'Ad Soyad zorunludur' })
  name: string;

  @IsString()
  @Length(11, 11, { message: 'T.C. Kimlik No 11 haneli olmalıdır' })
  nationalId: string;

  @IsEmail({}, { message: 'Geçerli bir kurumsal e-posta adresi girin' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Cep telefonu zorunludur' })
  phone: string;

  @IsString()
  @IsNotEmpty({ message: 'Profil fotoğrafı zorunludur' })
  profilePhotoUrl: string;

  @IsString()
  @MinLength(6, { message: 'Şifre en az 6 karakter olmalıdır' })
  password: string;

  // --- Sekme 2: Mali ve Yasal Kayıtlar ---
  @IsEnum(CompanyType, { message: 'Şirket türü seçin' })
  companyType: CompanyType;

  @IsString()
  @IsNotEmpty({ message: 'Şirket unvanı zorunludur' })
  companyName: string;

  @IsString()
  @IsNotEmpty({ message: 'Vergi dairesi zorunludur' })
  taxOffice: string;

  @IsString()
  @IsNotEmpty({ message: 'Vergi kimlik no zorunludur' })
  taxId: string;

  @IsString()
  @IsNotEmpty({ message: 'MYK Seviye 5 belge no zorunludur' })
  mykCertificateNo: string;

  @IsString()
  @IsNotEmpty({ message: 'Taşınmaz Ticareti Yetki Belgesi zorunludur' })
  realEstateLicenseUrl: string;

  // --- Sekme 3: Çalışma Modeli & Hakediş ---
  @IsOptional()
  @IsString()
  officeName?: string; // sabit deger, formdan otomatik gelir

  @IsEnum(CommissionShareType, { message: 'Komisyon paylaşım tipi seçin' })
  commissionShareType: CommissionShareType;

  // Varsayilan RAPP=%48 / MAXIMUM=%80'den farkli anlasilmis olabilir --
  // bu yuzden ayri, elle girilen/duzenlenen bir yuzde alani.
  @IsNumber({}, { message: 'Komisyon paylaşım yüzdesi geçerli bir sayı olmalıdır' })
  @Min(0, { message: 'Komisyon paylaşım yüzdesi 0-100 arasında olmalıdır' })
  @Max(100, { message: 'Komisyon paylaşım yüzdesi 0-100 arasında olmalıdır' })
  commissionSharePercentage: number;

  @IsDateString({}, { message: 'Sözleşme başlangıç tarihi zorunludur' })
  contractStartDate: string;

  @IsOptional()
  @IsString()
  mentorAgentId?: string; // opsiyonel

  // Aylik ofis aidati -- opsiyonel, olusturma sirasinda girilmezse
  // Broker daha sonra "Danisman Aidatlari" ekranindan da belirleyebilir.
  @IsOptional()
  @IsNumber({}, { message: 'Aylık aidat tutarı geçerli bir sayı olmalıdır' })
  @Min(0)
  monthlyDuesAmount?: number;

  // --- Sekme 4: Akademi & Eğitim ---
  @IsBoolean({ message: 'Power Start Eğitimi tamamlandı olarak işaretlenmelidir' })
  powerStartCompleted: boolean;

  @IsString()
  @IsNotEmpty({ message: 'Sertifika no zorunludur' })
  powerStartCertificateNo: string;

  @IsDateString({}, { message: 'Sertifika tarihi zorunludur' })
  powerStartCertificateDate: string;

  // --- Diger (mevcut, sablonda yok ama korunuyor) ---
  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  birthDate?: string;
}
