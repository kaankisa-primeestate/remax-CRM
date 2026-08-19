import { CompanyType, CommissionShareType } from '../user.entity';
export declare class CreateAgentDto {
    name: string;
    email: string;
    phone: string;
    password: string;
    nationalId?: string;
    profilePhotoUrl?: string;
    companyType?: CompanyType;
    companyName?: string;
    taxOffice?: string;
    taxId?: string;
    mykCertificateNo?: string;
    realEstateLicenseUrl?: string;
    officeName?: string;
    commissionShareType?: CommissionShareType;
    commissionSharePercentage?: number;
    contractStartDate?: string;
    mentorAgentId?: string;
    monthlyDuesAmount?: number;
    powerStartCompleted?: boolean;
    powerStartCertificateNo?: string;
    powerStartCertificateDate?: string;
    address?: string;
    birthDate?: string;
}
