import { Interaction } from './interaction.entity';
export declare enum CustomerType {
    BUYER = "buyer",
    SELLER = "seller",
    TENANT = "tenant",
    LANDLORD = "landlord",
    INVESTOR = "investor"
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
    propertyInterest: string | null;
    preferredDistricts: string[] | null;
    purchaseTimeline: string | null;
    pipelineStage: string;
    leadSource: string | null;
    agentId: string | null;
    interactions: Interaction[];
    createdAt: Date;
    updatedAt: Date;
}
