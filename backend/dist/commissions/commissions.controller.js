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
exports.CommissionsController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const commissions_service_1 = require("./commissions.service");
const create_commission_dto_1 = require("./create-commission.dto");
const create_commission_payment_dto_1 = require("./dto/create-commission-payment.dto");
const users_service_1 = require("../users/users.service");
let CommissionsController = class CommissionsController {
    constructor(commissionsService, usersService) {
        this.commissionsService = commissionsService;
        this.usersService = usersService;
    }
    create(dto, req) {
        return this.commissionsService.create(dto, req.user.userId, req.user.role);
    }
    findAll(req, agentId, status, fromDate, toDate) {
        return this.commissionsService.findAll(req.user.userId, req.user.role, {
            agentId,
            status,
            fromDate,
            toDate,
        });
    }
    summary(req, agentId, fromDate, toDate) {
        return this.commissionsService.summary(req.user.userId, req.user.role, {
            agentId,
            fromDate,
            toDate,
        });
    }
    async suggestRate(agentId, transactionAmount) {
        const agent = await this.usersService.findById(agentId);
        return this.commissionsService.suggestRate(agentId, Number(transactionAmount) || 0, agent?.tierCommissionRules || null, agent?.commissionSharePercentage != null ? Number(agent.commissionSharePercentage) : null);
    }
    findOne(id, req) {
        return this.commissionsService.findOne(id, req.user.userId, req.user.role);
    }
    update(id, dto, req) {
        return this.commissionsService.update(id, dto, req.user.userId, req.user.role);
    }
    remove(id, req) {
        return this.commissionsService.remove(id, req.user.role);
    }
    getPayments(id) {
        return this.commissionsService.getPayments(id);
    }
    addPayment(id, dto, req) {
        return this.commissionsService.addPayment(id, dto, req.user.role);
    }
    removePayment(paymentId, req) {
        return this.commissionsService.removePayment(paymentId, req.user.role);
    }
};
exports.CommissionsController = CommissionsController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_commission_dto_1.CreateCommissionDto, Object]),
    __metadata("design:returntype", void 0)
], CommissionsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('agentId')),
    __param(2, (0, common_1.Query)('status')),
    __param(3, (0, common_1.Query)('fromDate')),
    __param(4, (0, common_1.Query)('toDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String]),
    __metadata("design:returntype", void 0)
], CommissionsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('summary'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('agentId')),
    __param(2, (0, common_1.Query)('fromDate')),
    __param(3, (0, common_1.Query)('toDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", void 0)
], CommissionsController.prototype, "summary", null);
__decorate([
    (0, common_1.Get)('suggest-rate'),
    __param(0, (0, common_1.Query)('agentId')),
    __param(1, (0, common_1.Query)('transactionAmount')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], CommissionsController.prototype, "suggestRate", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], CommissionsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], CommissionsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], CommissionsController.prototype, "remove", null);
__decorate([
    (0, common_1.Get)(':id/payments'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CommissionsController.prototype, "getPayments", null);
__decorate([
    (0, common_1.Post)(':id/payments'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_commission_payment_dto_1.CreateCommissionPaymentDto, Object]),
    __metadata("design:returntype", void 0)
], CommissionsController.prototype, "addPayment", null);
__decorate([
    (0, common_1.Delete)('payments/:paymentId'),
    __param(0, (0, common_1.Param)('paymentId')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], CommissionsController.prototype, "removePayment", null);
exports.CommissionsController = CommissionsController = __decorate([
    (0, common_1.Controller)('commissions'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __metadata("design:paramtypes", [commissions_service_1.CommissionsService,
        users_service_1.UsersService])
], CommissionsController);
//# sourceMappingURL=commissions.controller.js.map