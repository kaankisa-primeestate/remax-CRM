export declare enum UserRole {
    BROKER = "broker",
    AGENT = "agent"
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
    passwordHash: string;
    role: UserRole;
    lastNotificationsSeenAt: Date | null;
    monthlyTarget: number | null;
    monthlyDuesAmount: number | null;
    createdAt: Date;
}
