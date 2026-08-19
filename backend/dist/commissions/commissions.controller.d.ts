import { CommissionsService } from './commissions.service';
import { CreateCommissionDto } from './create-commission.dto';
import { CreateCommissionPaymentDto } from './dto/create-commission-payment.dto';
import { UsersService } from '../users/users.service';
export declare class CommissionsController {
    private readonly commissionsService;
    private readonly usersService;
    constructor(commissionsService: CommissionsService, usersService: UsersService);
    create(dto: CreateCommissionDto, req: any): Promise<import("./commission.entity").Commission[]>;
    findAll(req: any, agentId?: string, status?: string, fromDate?: string, toDate?: string): Promise<import("./commission.entity").Commission[]>;
    summary(req: any, agentId?: string, fromDate?: string, toDate?: string): Promise<{
        count: number;
        totalGross: number;
        totalNetPayable: number;
        totalPaid: number;
        totalPending: number;
    }>;
    suggestRate(agentId: string, transactionAmount: string): Promise<{
        suggestedRate: number | null;
        ytdVolume: number;
        appliedTier: {
            threshold: number;
            rate: number;
        } | null;
    }>;
    findOne(id: string, req: any): Promise<import("./commission.entity").Commission>;
    update(id: string, dto: Partial<CreateCommissionDto> & {
        status?: string;
    }, req: any): Promise<import("./commission.entity").Commission>;
    remove(id: string, req: any): Promise<void>;
    getPayments(id: string): Promise<import("./commission-payment.entity").CommissionPayment[]>;
    addPayment(id: string, dto: CreateCommissionPaymentDto, req: any): Promise<import("./commission-payment.entity").CommissionPayment>;
    removePayment(paymentId: string, req: any): Promise<void>;
}
