import { Repository } from 'typeorm';
import { Commission } from './commission.entity';
import { CreateCommissionDto } from './create-commission.dto';
import { CommissionPayment } from './commission-payment.entity';
import { CreateCommissionPaymentDto } from './dto/create-commission-payment.dto';
import { BankTransaction } from '../bank-accounts/bank-transaction.entity';
import { Transaction } from '../transactions/transaction.entity';
export declare class CommissionsService {
    private commissionsRepository;
    private paymentsRepository;
    private bankTransactionRepository;
    private transactionRepository;
    constructor(commissionsRepository: Repository<Commission>, paymentsRepository: Repository<CommissionPayment>, bankTransactionRepository: Repository<BankTransaction>, transactionRepository: Repository<Transaction>);
    private calculateAmounts;
    create(dto: CreateCommissionDto, requestingUserId: string, requestingUserRole: string): Promise<Commission[]>;
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
    getPayments(commissionId: string): Promise<CommissionPayment[]>;
    addPayment(commissionId: string, dto: CreateCommissionPaymentDto, requestingUserRole: string): Promise<CommissionPayment>;
    removePayment(paymentId: string, requestingUserRole: string): Promise<void>;
    suggestRate(agentId: string, newTransactionAmount: number, tierRules: {
        threshold: number;
        rate: number;
    }[] | null, fallbackRate: number | null): Promise<{
        suggestedRate: number | null;
        ytdVolume: number;
        appliedTier: {
            threshold: number;
            rate: number;
        } | null;
    }>;
}
