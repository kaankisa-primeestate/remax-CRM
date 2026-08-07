import { CommissionsService } from './commissions.service';
import { CreateCommissionDto } from './create-commission.dto';
export declare class CommissionsController {
    private readonly commissionsService;
    constructor(commissionsService: CommissionsService);
    create(dto: CreateCommissionDto, req: any): Promise<import("./commission.entity").Commission>;
    findAll(req: any, agentId?: string, status?: string, fromDate?: string, toDate?: string): Promise<import("./commission.entity").Commission[]>;
    summary(req: any, agentId?: string, fromDate?: string, toDate?: string): Promise<{
        count: number;
        totalGross: number;
        totalNetPayable: number;
        totalPaid: number;
        totalPending: number;
    }>;
    findOne(id: string, req: any): Promise<import("./commission.entity").Commission>;
    update(id: string, dto: Partial<CreateCommissionDto> & {
        status?: string;
    }, req: any): Promise<import("./commission.entity").Commission>;
    remove(id: string, req: any): Promise<void>;
}
