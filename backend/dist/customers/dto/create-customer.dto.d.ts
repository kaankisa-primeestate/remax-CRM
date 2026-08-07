import { CustomerType } from '../customer.entity';
export declare class CreateCustomerDto {
    firstName: string;
    lastName: string;
    phone: string;
    email?: string;
    address?: string;
    type: CustomerType;
    budget?: number;
    budgetCurrency?: string;
    requirements?: string;
    notes?: string;
    agentId?: string;
}
