import { UsersService } from './users.service';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentProfileDto } from './dto/update-agent-profile.dto';
import { ChangePasswordDto } from '../auth/dto/change-password.dto';
import { CurrentUserPayload } from '../auth/current-user.decorator';
import { UserRole } from './user.entity';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    findAllAgents(): Promise<Omit<import("./user.entity").User, "passwordHash">[]>;
    findAgentRoster(): Promise<{
        id: string;
        name: string;
    }[]>;
    findMe(user: CurrentUserPayload): Promise<{
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
        companyType: import("./user.entity").CompanyType | null;
        taxOffice: string | null;
        mykCertificateNo: string | null;
        realEstateLicenseUrl: string | null;
        officeName: string | null;
        commissionShareType: import("./user.entity").CommissionShareType | null;
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
        isActive: boolean;
        resetTokenHash: string | null;
        resetTokenExpiresAt: Date | null;
        role: UserRole;
        lastNotificationsSeenAt: Date | null;
        monthlyTarget: number | null;
        monthlyDuesAmount: number | null;
        createdAt: Date;
    } | null>;
    createAgent(dto: CreateAgentDto): Promise<Omit<import("./user.entity").User, "passwordHash">>;
    setMonthlyTarget(id: string, monthlyTarget: number): Promise<Omit<import("./user.entity").User, "passwordHash">>;
    setMonthlyDues(id: string, monthlyDuesAmount: number): Promise<Omit<import("./user.entity").User, "passwordHash">>;
    updateAgentProfile(id: string, dto: UpdateAgentProfileDto): Promise<Omit<import("./user.entity").User, "passwordHash">>;
    brokerResetPassword(id: string): Promise<{
        tempPassword: string;
    }>;
    setActive(id: string, isActive: boolean): Promise<void>;
    removeAgent(id: string): Promise<{
        success: boolean;
    }>;
    changePassword(dto: ChangePasswordDto, user: CurrentUserPayload): Promise<{
        success: boolean;
    }>;
}
