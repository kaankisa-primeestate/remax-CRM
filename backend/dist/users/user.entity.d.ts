export declare enum UserRole {
    BROKER = "broker",
    AGENT = "agent"
}
export declare enum CompanyType {
    SAHIS = "sahis",
    LIMITED = "limited"
}
export declare enum CommissionShareType {
    RAPP = "rapp",
    MAXIMUM = "maximum"
}
export declare class User {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    address: string | null;
    birthDate: string | null;
    nationalId: string | null;
    companyName: string | null;
    taxId: string | null;
    profilePhotoUrl: string | null;
    companyType: CompanyType | null;
    taxOffice: string | null;
    mykCertificateNo: string | null;
    realEstateLicenseUrl: string | null;
    officeName: string | null;
    commissionShareType: CommissionShareType | null;
    commissionSharePercentage: number | null;
    tierCommissionRules: {
        threshold: number;
        rate: number;
    }[] | null;
    contractStartDate: string | null;
    mentorAgentId: string | null;
    powerStartCompleted: boolean;
    powerStartCertificateNo: string | null;
    powerStartCertificateDate: string | null;
    passwordHash: string;
    isActive: boolean;
    resetTokenHash: string | null;
    resetTokenExpiresAt: Date | null;
    role: UserRole;
    lastNotificationsSeenAt: Date | null;
    monthlyTarget: number | null;
    monthlyDuesAmount: number | null;
    createdAt: Date;
}
