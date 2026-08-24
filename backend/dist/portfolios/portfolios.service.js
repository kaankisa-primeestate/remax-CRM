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
exports.PortfoliosService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const property_entity_1 = require("./property.entity");
let PortfoliosService = class PortfoliosService {
    constructor(propertyRepo) {
        this.propertyRepo = propertyRepo;
    }
    async create(dto, currentUser) {
        const agentId = currentUser.role === 'agent' ? currentUser.userId : dto.agentId ?? null;
        const property = this.propertyRepo.create({
            ...dto,
            agentId,
            status: property_entity_1.PropertyStatus.PENDING_APPROVAL,
        });
        return this.propertyRepo.save(property);
    }
    async findAll(query, currentUser) {
        const qb = this.propertyRepo
            .createQueryBuilder('property')
            .orderBy('property.createdAt', 'DESC');
        if (query.search) {
            qb.andWhere('(property.title ILIKE :search OR property.province ILIKE :search OR property.district ILIKE :search OR property.neighborhood ILIKE :search)', { search: `%${query.search}%` });
        }
        if (query.propertyType) {
            qb.andWhere('property.propertyType = :propertyType', { propertyType: query.propertyType });
        }
        if (query.listingType) {
            qb.andWhere('property.listingType = :listingType', { listingType: query.listingType });
        }
        if (query.status) {
            qb.andWhere('property.status = :status', { status: query.status });
        }
        if (query.district) {
            qb.andWhere('property.district ILIKE :district', { district: `%${query.district}%` });
        }
        if (query.minPrice) {
            qb.andWhere('property.price >= :minPrice', { minPrice: query.minPrice });
        }
        if (query.maxPrice) {
            qb.andWhere('property.price <= :maxPrice', { maxPrice: query.maxPrice });
        }
        if (query.minArea) {
            qb.andWhere('property.areaM2 >= :minArea', { minArea: query.minArea });
        }
        if (query.maxArea) {
            qb.andWhere('property.areaM2 <= :maxArea', { maxArea: query.maxArea });
        }
        if (query.rooms) {
            qb.andWhere('property.rooms = :rooms', { rooms: query.rooms });
        }
        if (query.minBuildingAge) {
            qb.andWhere('property.buildingAge >= :minBuildingAge', { minBuildingAge: query.minBuildingAge });
        }
        if (query.maxBuildingAge) {
            qb.andWhere('property.buildingAge <= :maxBuildingAge', { maxBuildingAge: query.maxBuildingAge });
        }
        if (query.heatingType) {
            qb.andWhere('property.heatingType ILIKE :heatingType', { heatingType: `%${query.heatingType}%` });
        }
        if (query.view) {
            qb.andWhere('property.view ILIKE :view', { view: `%${query.view}%` });
        }
        if (query.hasPool === 'true') {
            qb.andWhere('property.hasPool = true');
        }
        if (query.hasGym === 'true') {
            qb.andWhere('property.hasGym = true');
        }
        if (query.hasSecurity === 'true') {
            qb.andWhere('property.hasSecurity = true');
        }
        if (query.hasParking === 'true') {
            qb.andWhere('property.hasParking = true');
        }
        if (query.keyword) {
            qb.andWhere('(property.notes ILIKE :keyword OR property.view ILIKE :keyword OR property.facade ILIKE :keyword OR property.heatingType ILIKE :keyword OR property.deedStatus ILIKE :keyword OR property.title ILIKE :keyword)', { keyword: `%${query.keyword}%` });
        }
        if (currentUser.role === 'agent') {
            if (query.scope === 'office') {
                qb.andWhere('property.agentId != :ownAgentId', { ownAgentId: currentUser.userId });
                qb.andWhere('property.status IN (:...visibleStatuses)', {
                    visibleStatuses: [property_entity_1.PropertyStatus.ACTIVE, property_entity_1.PropertyStatus.SOLD, property_entity_1.PropertyStatus.RENTED],
                });
            }
            else {
                qb.andWhere('property.agentId = :agentId', { agentId: currentUser.userId });
            }
        }
        else if (query.agentId) {
            qb.andWhere('property.agentId = :agentId', { agentId: query.agentId });
        }
        return qb.getMany();
    }
    async findOne(id, currentUser) {
        const property = await this.propertyRepo.findOne({ where: { id } });
        if (!property) {
            throw new common_1.NotFoundException('Portföy bulunamadı');
        }
        const isOwner = property.agentId === currentUser.userId;
        const isBroker = currentUser.role === 'broker';
        const isPubliclyShareable = property.status === property_entity_1.PropertyStatus.ACTIVE ||
            property.status === property_entity_1.PropertyStatus.SOLD ||
            property.status === property_entity_1.PropertyStatus.RENTED;
        if (!isOwner && !isBroker && !isPubliclyShareable) {
            throw new common_1.ForbiddenException('Bu portföy henüz onay sürecinde, sadece sahibi ve Broker görebilir');
        }
        return property;
    }
    async update(id, dto, currentUser) {
        const property = await this.findOne(id, currentUser);
        this.assertWriteAccess(property, currentUser);
        const safeDto = currentUser.role === 'agent' ? { ...dto, agentId: undefined } : dto;
        const statusChanging = safeDto.status !== undefined && safeDto.status !== property.status;
        if (statusChanging && safeDto.status === property_entity_1.PropertyStatus.ACTIVE) {
            const wasAwaitingApproval = property.status === property_entity_1.PropertyStatus.PENDING_APPROVAL ||
                property.status === property_entity_1.PropertyStatus.NEEDS_REVISION;
            if (wasAwaitingApproval && currentUser.role !== 'broker') {
                throw new common_1.ForbiddenException('Bu ilanı sadece Broker onaylayabilir');
            }
        }
        Object.assign(property, safeDto);
        if (statusChanging) {
            property.statusChangedAt = new Date();
            if (safeDto.status === property_entity_1.PropertyStatus.PENDING_APPROVAL) {
                property.revisionNote = null;
            }
        }
        return this.propertyRepo.save(property);
    }
    async remove(id, currentUser) {
        const property = await this.findOne(id, currentUser);
        this.assertWriteAccess(property, currentUser);
        await this.propertyRepo.remove(property);
    }
    assertWriteAccess(property, currentUser) {
        if (currentUser.role === 'agent' && property.agentId !== currentUser.userId) {
            throw new common_1.ForbiddenException('Bu portföyü düzenleme yetkiniz yok');
        }
    }
    async findOnePublic(id) {
        const property = await this.propertyRepo.findOne({ where: { id } });
        if (!property) {
            throw new common_1.NotFoundException('İlan bulunamadı');
        }
        return {
            id: property.id,
            title: property.title,
            propertyType: property.propertyType,
            listingType: property.listingType,
            province: property.province,
            district: property.district,
            neighborhood: property.neighborhood,
            areaM2: property.areaM2,
            price: property.price,
            priceCurrency: property.priceCurrency,
            rooms: property.rooms,
            bathrooms: property.bathrooms,
            floor: property.floor,
            heatingType: property.heatingType,
            dues: property.dues,
            hasPool: property.hasPool,
            hasGym: property.hasGym,
            hasSecurity: property.hasSecurity,
            hasParking: property.hasParking,
            view: property.view,
            facade: property.facade,
            buildingAge: property.buildingAge,
            photoUrls: property.photoUrls,
        };
    }
};
exports.PortfoliosService = PortfoliosService;
exports.PortfoliosService = PortfoliosService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(property_entity_1.Property)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], PortfoliosService);
//# sourceMappingURL=portfolios.service.js.map