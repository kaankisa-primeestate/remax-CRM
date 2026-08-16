import { OnModuleInit } from '@nestjs/common';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentProfileDto } from './dto/update-agent-profile.dto';
export declare class UsersService implements OnModuleInit {
    private readonly userRepo;
    private readonly logger;
    constructor(userRepo: Repository<User>);
    onModuleInit(): Promise<void>;
    findByEmail(email: string): Promise<User | null>;
    findById(id: string): Promise<User | null>;
    changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void>;
    createAgent(dto: CreateAgentDto): Promise<Omit<User, 'passwordHash'>>;
    findAllAgents(): Promise<Omit<User, 'passwordHash'>[]>;
    setMonthlyTarget(agentId: string, monthlyTarget: number): Promise<Omit<User, 'passwordHash'>>;
    setMonthlyDues(agentId: string, monthlyDuesAmount: number): Promise<Omit<User, 'passwordHash'>>;
    updateAgentProfile(agentId: string, dto: UpdateAgentProfileDto): Promise<Omit<User, 'passwordHash'>>;
}
