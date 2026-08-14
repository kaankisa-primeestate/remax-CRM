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
    preferredDistrict?: string;
    preferredRooms?: string[];
    wantsSeaView?: boolean;
    wantsNearMetro?: boolean;
    propertyInterest?: string;
    preferredDistricts?: string[];
    purchaseTimeline?: string;
}
