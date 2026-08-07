import { UsersService } from './users.service';
import { CreateAgentDto } from './dto/create-agent.dto';
import { ChangePasswordDto } from '../auth/dto/change-password.dto';
import { CurrentUserPayload } from '../auth/current-user.decorator';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    findAllAgents(): Promise<Omit<import("./user.entity").User, "passwordHash">[]>;
    createAgent(dto: CreateAgentDto): Promise<Omit<import("./user.entity").User, "passwordHash">>;
    changePassword(dto: ChangePasswordDto, user: CurrentUserPayload): Promise<{
        success: boolean;
    }>;
}
