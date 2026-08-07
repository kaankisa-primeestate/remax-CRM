import { Customer } from './customer.entity';
export declare enum InteractionType {
    CALL = "call",
    MEETING = "meeting",
    MESSAGE = "message",
    EMAIL = "email"
}
export declare class Interaction {
    id: string;
    customer: Customer;
    customerId: string;
    type: InteractionType;
    notes: string;
    actionItems: string;
    occurredAt: Date;
    createdAt: Date;
}
