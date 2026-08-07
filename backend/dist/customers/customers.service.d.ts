import { Repository } from 'typeorm';
import { Customer } from './customer.entity';
import { Interaction } from './interaction.entity';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CreateInteractionDto } from './dto/create-interaction.dto';
import { CurrentUserPayload } from '../auth/current-user.decorator';
export interface FindCustomersQuery {
    search?: string;
    type?: string;
    agentId?: string;
}
export declare class CustomersService {
    private readonly customerRepo;
    private readonly interactionRepo;
    constructor(customerRepo: Repository<Customer>, interactionRepo: Repository<Interaction>);
    create(dto: CreateCustomerDto, currentUser: CurrentUserPayload): Promise<Customer>;
    findAll(query: FindCustomersQuery, currentUser: CurrentUserPayload): Promise<Customer[]>;
    findOne(id: string, currentUser: CurrentUserPayload): Promise<Customer>;
    update(id: string, dto: UpdateCustomerDto, currentUser: CurrentUserPayload): Promise<Customer>;
    remove(id: string, currentUser: CurrentUserPayload): Promise<void>;
    addInteraction(customerId: string, dto: CreateInteractionDto, currentUser: CurrentUserPayload): Promise<Interaction>;
    private assertAccess;
}
