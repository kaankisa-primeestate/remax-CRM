import { CompanyType, CommissionShareType } from '../user.entity';
export declare class CreateAgentDto {
    name: string;
    nationalId: string;
    email: string;
    phone: string;
    profilePhotoUrl: string;
    password: string;
    companyType: CompanyType;
    companyName: string;
    taxOffice: string;
    taxId: string;
    mykCertificateNo: string;
    realEstateLicenseUrl: string;
    officeName?: string;
    commissionShareType: CommissionShareType;
    contractStartDate: string;
    mentorAgentId?: string;
    powerStartCompleted: boolean;
    powerStartCertificateNo: string;
    powerStartCertificateDate: string;
    address?: string;
    birthDate?: string;
}
