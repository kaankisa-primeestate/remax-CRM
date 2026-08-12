import { Interaction } from './interaction.entity';
export declare enum CustomerType {
    BUYER = "buyer",
    SELLER = "seller",
    TENANT = "tenant",
    LANDLORD = "landlord"
}
export declare class Customer {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    address: string;
    type: CustomerType;
    budget: number;
    budgetCurrency: string;
    requirements: string;
    notes: string;
    preferredDistrict: string | null;
    preferredRooms: string[] | null;
    wantsSeaView: boolean | null;
    wantsNearMetro: boolean | null;
    agentId: string | null;
    interactions: Interaction[];
    createdAt: Date;
    updatedAt: Date;
}
