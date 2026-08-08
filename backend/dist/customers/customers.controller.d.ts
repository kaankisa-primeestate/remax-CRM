import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CreateInteractionDto } from './dto/create-interaction.dto';
import { CurrentUserPayload } from '../auth/current-user.decorator';
export declare class CustomersController {
    private readonly customersService;
    constructor(customersService: CustomersService);
    create(dto: CreateCustomerDto, user: CurrentUserPayload): Promise<import("./customer.entity").Customer>;
    findAll(user: CurrentUserPayload, search?: string, type?: string, agentId?: string, keyword?: string): Promise<import("./customer.entity").Customer[]>;
    findOne(id: string, user: CurrentUserPayload): Promise<import("./customer.entity").Customer>;
    update(id: string, dto: UpdateCustomerDto, user: CurrentUserPayload): Promise<import("./customer.entity").Customer>;
    remove(id: string, user: CurrentUserPayload): Promise<void>;
    addInteraction(id: string, dto: CreateInteractionDto, user: CurrentUserPayload): Promise<import("./interaction.entity").Interaction>;
}
