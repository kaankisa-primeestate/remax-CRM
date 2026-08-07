import { InteractionType } from '../interaction.entity';
export declare class CreateInteractionDto {
    type: InteractionType;
    notes: string;
    actionItems?: string;
    occurredAt: string;
}
