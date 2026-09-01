import { OnModuleInit } from '@nestjs/common';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { Customer } from '../customers/customer.entity';
import { Property } from '../portfolios/property.entity';
import { Transaction } from '../transactions/transaction.entity';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentProfileDto } from './dto/update-agent-profile.dto';
export declare class UsersService implements OnModuleInit {
    private readonly userRepo;
    private readonly customerRepo;
    private readonly propertyRepo;
    private readonly transactionRepo;
    private readonly logger;
    constructor(userRepo: Repository<User>, customerRepo: Repository<Customer>, propertyRepo: Repository<Property>, transactionRepo: Repository<Transaction>);
    onModuleInit(): Promise<void>;
    findByEmail(email: string): Promise<User | null>;
    findById(id: string): Promise<User | null>;
    changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void>;
    updateOwnEmail(userId: string, requestingUserRole: string, currentPassword: string, newEmail: string): Promise<void>;
    createBroker(requestingUserRole: string, name: string, email: string, password: string): Promise<Omit<User, 'passwordHash'>>;
    setResetToken(userId: string, tokenHash: string, expiresAt: Date): Promise<void>;
    setPasswordAndClearResetToken(userId: string, newPassword: string): Promise<void>;
    brokerResetPassword(agentId: string): Promise<string>;
    setActive(agentId: string, isActive: boolean): Promise<void>;
    removeAgent(agentId: string): Promise<void>;
    createAgent(dto: CreateAgentDto): Promise<Omit<User, 'passwordHash'>>;
    findAllAgents(): Promise<Omit<User, 'passwordHash'>[]>;
    findAgentRoster(): Promise<{
        id: string;
        name: string;
    }[]>;
    setMonthlyTarget(agentId: string, monthlyTarget: number): Promise<Omit<User, 'passwordHash'>>;
    setMonthlyDues(agentId: string, monthlyDuesAmount: number, duesStartDate?: string): Promise<Omit<User, 'passwordHash'>>;
    updateAgentProfile(agentId: string, dto: UpdateAgentProfileDto): Promise<Omit<User, 'passwordHash'>>;
}
