import { UsersService } from './users.service';
import { CreateAgentDto } from './dto/create-agent.dto';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    findAllAgents(): Promise<Omit<import("./user.entity").User, "passwordHash">[]>;
    createAgent(dto: CreateAgentDto): Promise<Omit<import("./user.entity").User, "passwordHash">>;
}
