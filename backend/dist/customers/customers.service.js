"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomersService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const customer_entity_1 = require("./customer.entity");
const interaction_entity_1 = require("./interaction.entity");
let CustomersService = class CustomersService {
    constructor(customerRepo, interactionRepo) {
        this.customerRepo = customerRepo;
        this.interactionRepo = interactionRepo;
    }
    async create(dto, currentUser) {
        const existing = await this.customerRepo.findOne({ where: { phone: dto.phone } });
        if (existing) {
            throw new common_1.ConflictException('Bu telefon numarasıyla kayıtlı bir müşteri zaten var');
        }
        const agentId = currentUser.role === 'agent' ? currentUser.userId : dto.agentId ?? null;
        const customer = this.customerRepo.create({ ...dto, agentId });
        return this.customerRepo.save(customer);
    }
    async findAll(query, currentUser) {
        const qb = this.customerRepo
            .createQueryBuilder('customer')
            .orderBy('customer.createdAt', 'DESC');
        if (query.search) {
            qb.andWhere('(customer.firstName ILIKE :search OR customer.lastName ILIKE :search OR customer.phone ILIKE :search)', { search: `%${query.search}%` });
        }
        if (query.type) {
            qb.andWhere('customer.type = :type', { type: query.type });
        }
        if (query.keyword) {
            qb.andWhere('(customer.requirements ILIKE :keyword OR customer.notes ILIKE :keyword)', { keyword: `%${query.keyword}%` });
        }
        if (currentUser.role === 'agent') {
            qb.andWhere('customer.agentId = :agentId', { agentId: currentUser.userId });
        }
        else if (query.agentId) {
            qb.andWhere('customer.agentId = :agentId', { agentId: query.agentId });
        }
        return qb.getMany();
    }
    async findOne(id, currentUser) {
        const customer = await this.customerRepo.findOne({
            where: { id },
            relations: { interactions: true },
            order: { interactions: { occurredAt: 'DESC' } },
        });
        if (!customer) {
            throw new common_1.NotFoundException('Müşteri bulunamadı');
        }
        this.assertAccess(customer, currentUser);
        return customer;
    }
    async update(id, dto, currentUser) {
        const customer = await this.findOne(id, currentUser);
        const safeDto = currentUser.role === 'agent' ? { ...dto, agentId: undefined } : dto;
        Object.assign(customer, safeDto);
        return this.customerRepo.save(customer);
    }
    async remove(id, currentUser) {
        const customer = await this.findOne(id, currentUser);
        await this.customerRepo.remove(customer);
    }
    async addInteraction(customerId, dto, currentUser) {
        await this.findOne(customerId, currentUser);
        const interaction = this.interactionRepo.create({
            ...dto,
            customerId,
            occurredAt: new Date(dto.occurredAt),
        });
        return this.interactionRepo.save(interaction);
    }
    assertAccess(customer, currentUser) {
        if (currentUser.role === 'agent' && customer.agentId !== currentUser.userId) {
            throw new common_1.ForbiddenException('Bu müşteri kaydına erişim yetkiniz yok');
        }
    }
};
exports.CustomersService = CustomersService;
exports.CustomersService = CustomersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(customer_entity_1.Customer)),
    __param(1, (0, typeorm_1.InjectRepository)(interaction_entity_1.Interaction)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], CustomersService);
//# sourceMappingURL=customers.service.js.map