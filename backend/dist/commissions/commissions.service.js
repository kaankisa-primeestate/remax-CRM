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
exports.CommissionsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const commission_entity_1 = require("./commission.entity");
let CommissionsService = class CommissionsService {
    constructor(commissionsRepository) {
        this.commissionsRepository = commissionsRepository;
    }
    calculateAmounts(dto) {
        const grossCommission = (dto.transactionAmount * dto.commissionRate) / 100;
        const agentGrossShare = (grossCommission * dto.agentSharePercent) / 100;
        const withholding = (agentGrossShare * (dto.withholdingTaxPercent || 0)) / 100;
        const vat = (agentGrossShare * (dto.vatPercent || 0)) / 100;
        const penalty = dto.penaltyAmount || 0;
        const netPayable = agentGrossShare - withholding - vat - penalty;
        return { grossCommission, agentGrossShare, netPayable };
    }
    async create(dto, requestingUserId, requestingUserRole) {
        let agentId = dto.agentId;
        if (requestingUserRole === 'agent') {
            agentId = requestingUserId;
        }
        else if (!agentId) {
            throw new common_1.ForbiddenException('Broker bir danışman seçmelidir (agentId zorunlu)');
        }
        const { grossCommission, agentGrossShare, netPayable } = this.calculateAmounts(dto);
        const commission = this.commissionsRepository.create({
            ...dto,
            agentId,
            grossCommission,
            agentGrossShare,
            netPayable,
            withholdingTaxPercent: dto.withholdingTaxPercent || 0,
            vatPercent: dto.vatPercent || 0,
            penaltyAmount: dto.penaltyAmount || 0,
        });
        return this.commissionsRepository.save(commission);
    }
    async findAll(requestingUserId, requestingUserRole, filters) {
        const query = this.commissionsRepository.createQueryBuilder('commission');
        if (requestingUserRole === 'agent') {
            query.andWhere('commission.agentId = :agentId', {
                agentId: requestingUserId,
            });
        }
        else if (filters.agentId) {
            query.andWhere('commission.agentId = :agentId', {
                agentId: filters.agentId,
            });
        }
        if (filters.status) {
            query.andWhere('commission.status = :status', {
                status: filters.status,
            });
        }
        if (filters.fromDate) {
            query.andWhere('commission.dueDate >= :fromDate', {
                fromDate: filters.fromDate,
            });
        }
        if (filters.toDate) {
            query.andWhere('commission.dueDate <= :toDate', {
                toDate: filters.toDate,
            });
        }
        query.orderBy('commission.dueDate', 'DESC');
        return query.getMany();
    }
    async findOne(id, requestingUserId, requestingUserRole) {
        const commission = await this.commissionsRepository.findOne({
            where: { id },
        });
        if (!commission) {
            throw new common_1.NotFoundException('Komisyon kaydı bulunamadı');
        }
        if (requestingUserRole === 'agent' &&
            commission.agentId !== requestingUserId) {
            throw new common_1.ForbiddenException('Bu kayda erişim yetkiniz yok');
        }
        return commission;
    }
    async update(id, dto, requestingUserId, requestingUserRole) {
        const commission = await this.findOne(id, requestingUserId, requestingUserRole);
        if (requestingUserRole === 'agent' && dto.status) {
            throw new common_1.ForbiddenException('Durum değişikliğini sadece Broker yapabilir');
        }
        const merged = { ...commission, ...dto };
        const { grossCommission, agentGrossShare, netPayable } = this.calculateAmounts(merged);
        Object.assign(commission, dto, {
            grossCommission,
            agentGrossShare,
            netPayable,
        });
        return this.commissionsRepository.save(commission);
    }
    async remove(id, requestingUserRole) {
        if (requestingUserRole !== 'broker') {
            throw new common_1.ForbiddenException('Sadece Broker silebilir');
        }
        const commission = await this.commissionsRepository.findOne({
            where: { id },
        });
        if (!commission) {
            throw new common_1.NotFoundException('Komisyon kaydı bulunamadı');
        }
        await this.commissionsRepository.remove(commission);
    }
    async summary(requestingUserId, requestingUserRole, filters) {
        const commissions = await this.findAll(requestingUserId, requestingUserRole, filters);
        const totalGross = commissions.reduce((sum, c) => sum + Number(c.grossCommission), 0);
        const totalNetPayable = commissions.reduce((sum, c) => sum + Number(c.netPayable), 0);
        const totalPaid = commissions
            .filter((c) => c.status === 'paid')
            .reduce((sum, c) => sum + Number(c.netPayable), 0);
        const totalPending = commissions
            .filter((c) => c.status !== 'paid')
            .reduce((sum, c) => sum + Number(c.netPayable), 0);
        return {
            count: commissions.length,
            totalGross,
            totalNetPayable,
            totalPaid,
            totalPending,
        };
    }
};
exports.CommissionsService = CommissionsService;
exports.CommissionsService = CommissionsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(commission_entity_1.Commission)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], CommissionsService);
//# sourceMappingURL=commissions.service.js.map