import { Repository } from 'typeorm';
import { Commission } from './commission.entity';
import { CreateCommissionDto } from './create-commission.dto';
export declare class CommissionsService {
    private commissionsRepository;
    constructor(commissionsRepository: Repository<Commission>);
    private calculateAmounts;
    create(dto: CreateCommissionDto, requestingUserId: string, requestingUserRole: string): Promise<Commission>;
    findAll(requestingUserId: string, requestingUserRole: string, filters: {
        agentId?: string;
        status?: string;
        fromDate?: string;
        toDate?: string;
    }): Promise<Commission[]>;
    findOne(id: string, requestingUserId: string, requestingUserRole: string): Promise<Commission>;
    update(id: string, dto: Partial<CreateCommissionDto> & {
        status?: string;
    }, requestingUserId: string, requestingUserRole: string): Promise<Commission>;
    remove(id: string, requestingUserRole: string): Promise<void>;
    summary(requestingUserId: string, requestingUserRole: string, filters: {
        agentId?: string;
        fromDate?: string;
        toDate?: string;
    }): Promise<{
        count: number;
        totalGross: number;
        totalNetPayable: number;
        totalPaid: number;
        totalPending: number;
    }>;
}
