export declare enum UserRole {
    BROKER = "broker",
    AGENT = "agent"
}
export declare class User {
    id: string;
    name: string;
    email: string;
    passwordHash: string;
    role: UserRole;
    lastNotificationsSeenAt: Date | null;
    createdAt: Date;
}
