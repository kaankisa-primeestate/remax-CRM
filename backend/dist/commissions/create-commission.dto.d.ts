export declare class CreateCommissionDto {
    propertyId?: string;
    customerId?: string;
    transactionId?: string;
    agentId?: string;
    transactionType: string;
    propertyTitle?: string;
    transactionAmount: number;
    commissionRate: number;
    agentSharePercent: number;
    withholdingTaxPercent?: number;
    vatPercent?: number;
    penaltyAmount?: number;
    dueDate: string;
    notes?: string;
}
