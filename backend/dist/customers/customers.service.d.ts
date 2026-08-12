import { Repository } from 'typeorm';
import { Customer } from './customer.entity';
import { Interaction } from './interaction.entity';
import { VoiceNote } from './voice-note.entity';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CreateInteractionDto } from './dto/create-interaction.dto';
import { CreateVoiceNoteDto } from './dto/create-voice-note.dto';
import { CurrentUserPayload } from '../auth/current-user.decorator';
export interface FindCustomersQuery {
    search?: string;
    type?: string;
    agentId?: string;
    keyword?: string;
}
export declare class CustomersService {
    private readonly customerRepo;
    private readonly interactionRepo;
    private readonly voiceNoteRepo;
    constructor(customerRepo: Repository<Customer>, interactionRepo: Repository<Interaction>, voiceNoteRepo: Repository<VoiceNote>);
    create(dto: CreateCustomerDto, currentUser: CurrentUserPayload): Promise<Customer>;
    findAll(query: FindCustomersQuery, currentUser: CurrentUserPayload): Promise<Customer[]>;
    findOne(id: string, currentUser: CurrentUserPayload): Promise<Customer>;
    update(id: string, dto: UpdateCustomerDto, currentUser: CurrentUserPayload): Promise<Customer>;
    remove(id: string, currentUser: CurrentUserPayload): Promise<void>;
    addInteraction(customerId: string, dto: CreateInteractionDto, currentUser: CurrentUserPayload): Promise<Interaction>;
    addVoiceNote(customerId: string, dto: CreateVoiceNoteDto, currentUser: CurrentUserPayload): Promise<VoiceNote>;
    findVoiceNotes(customerId: string, currentUser: CurrentUserPayload): Promise<VoiceNote[]>;
    removeVoiceNote(customerId: string, voiceNoteId: string, currentUser: CurrentUserPayload): Promise<void>;
    private assertAccess;
}
