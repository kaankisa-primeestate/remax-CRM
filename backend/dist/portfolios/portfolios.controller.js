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
exports.PortfoliosController = void 0;
const common_1 = require("@nestjs/common");
const portfolios_service_1 = require("./portfolios.service");
const create_property_dto_1 = require("./dto/create-property.dto");
const update_property_dto_1 = require("./dto/update-property.dto");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const current_user_decorator_1 = require("../auth/current-user.decorator");
let PortfoliosController = class PortfoliosController {
    constructor(portfoliosService) {
        this.portfoliosService = portfoliosService;
    }
    create(dto, user) {
        return this.portfoliosService.create(dto, user);
    }
    findAll(user, search, propertyType, listingType, status, district, minPrice, maxPrice, minArea, maxArea, agentId, scope, rooms, minBuildingAge, maxBuildingAge, heatingType, view, hasPool, hasGym, hasSecurity, hasParking, keyword) {
        return this.portfoliosService.findAll({
            search, propertyType, listingType, status, district, minPrice, maxPrice, minArea, maxArea, agentId, scope,
            rooms, minBuildingAge, maxBuildingAge, heatingType, view, hasPool, hasGym, hasSecurity, hasParking, keyword,
        }, user);
    }
    findOne(id, user) {
        return this.portfoliosService.findOne(id, user);
    }
    update(id, dto, user) {
        return this.portfoliosService.update(id, dto, user);
    }
    remove(id, user) {
        return this.portfoliosService.remove(id, user);
    }
};
exports.PortfoliosController = PortfoliosController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_property_dto_1.CreatePropertyDto, Object]),
    __metadata("design:returntype", void 0)
], PortfoliosController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('search')),
    __param(2, (0, common_1.Query)('propertyType')),
    __param(3, (0, common_1.Query)('listingType')),
    __param(4, (0, common_1.Query)('status')),
    __param(5, (0, common_1.Query)('district')),
    __param(6, (0, common_1.Query)('minPrice')),
    __param(7, (0, common_1.Query)('maxPrice')),
    __param(8, (0, common_1.Query)('minArea')),
    __param(9, (0, common_1.Query)('maxArea')),
    __param(10, (0, common_1.Query)('agentId')),
    __param(11, (0, common_1.Query)('scope')),
    __param(12, (0, common_1.Query)('rooms')),
    __param(13, (0, common_1.Query)('minBuildingAge')),
    __param(14, (0, common_1.Query)('maxBuildingAge')),
    __param(15, (0, common_1.Query)('heatingType')),
    __param(16, (0, common_1.Query)('view')),
    __param(17, (0, common_1.Query)('hasPool')),
    __param(18, (0, common_1.Query)('hasGym')),
    __param(19, (0, common_1.Query)('hasSecurity')),
    __param(20, (0, common_1.Query)('hasParking')),
    __param(21, (0, common_1.Query)('keyword')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String, String, String, String, String, String, String, String, String, String, String, String, String, String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], PortfoliosController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], PortfoliosController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_property_dto_1.UpdatePropertyDto, Object]),
    __metadata("design:returntype", void 0)
], PortfoliosController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], PortfoliosController.prototype, "remove", null);
exports.PortfoliosController = PortfoliosController = __decorate([
    (0, common_1.Controller)('properties'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [portfolios_service_1.PortfoliosService])
], PortfoliosController);
//# sourceMappingURL=portfolios.controller.js.map