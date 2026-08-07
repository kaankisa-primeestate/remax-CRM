export declare enum CommissionStatus {
    PENDING = "pending",
    APPROVED = "approved",
    PAID = "paid"
}
export declare class Commission {
    id: string;
    propertyId: string | null;
    customerId: string | null;
    agentId: string;
    transactionType: string;
    propertyTitle: string | null;
    transactionAmount: number;
    commissionRate: number;
    grossCommission: number;
    agentSharePercent: number;
    agentGrossShare: number;
    withholdingTaxPercent: number;
    vatPercent: number;
    penaltyAmount: number;
    netPayable: number;
    dueDate: string;
    status: CommissionStatus;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
}
