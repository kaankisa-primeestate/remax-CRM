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
exports.UsersController = void 0;
const common_1 = require("@nestjs/common");
const users_service_1 = require("./users.service");
const create_agent_dto_1 = require("./dto/create-agent.dto");
const update_agent_profile_dto_1 = require("./dto/update-agent-profile.dto");
const change_password_dto_1 = require("../auth/dto/change-password.dto");
const change_email_dto_1 = require("../auth/dto/change-email.dto");
const create_broker_dto_1 = require("../auth/dto/create-broker.dto");
const current_user_decorator_1 = require("../auth/current-user.decorator");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const roles_guard_1 = require("../auth/roles.guard");
const roles_decorator_1 = require("../auth/roles.decorator");
const user_entity_1 = require("./user.entity");
let UsersController = class UsersController {
    constructor(usersService) {
        this.usersService = usersService;
    }
    findAllAgents() {
        return this.usersService.findAllAgents();
    }
    findAgentRoster() {
        return this.usersService.findAgentRoster();
    }
    async findMe(user) {
        const found = await this.usersService.findById(user.userId);
        if (!found)
            return null;
        const { passwordHash, ...safe } = found;
        return safe;
    }
    createAgent(dto) {
        return this.usersService.createAgent(dto);
    }
    setMonthlyTarget(id, monthlyTarget) {
        return this.usersService.setMonthlyTarget(id, monthlyTarget);
    }
    setMonthlyDues(id, monthlyDuesAmount, duesStartDate) {
        return this.usersService.setMonthlyDues(id, monthlyDuesAmount, duesStartDate);
    }
    updateAgentProfile(id, dto) {
        return this.usersService.updateAgentProfile(id, dto);
    }
    async brokerResetPassword(id) {
        const tempPassword = await this.usersService.brokerResetPassword(id);
        return { tempPassword };
    }
    setActive(id, isActive) {
        return this.usersService.setActive(id, isActive);
    }
    async removeAgent(id) {
        await this.usersService.removeAgent(id);
        return { success: true };
    }
    async changePassword(dto, user) {
        await this.usersService.changePassword(user.userId, dto.currentPassword, dto.newPassword);
        return { success: true };
    }
    async changeEmail(dto, user) {
        await this.usersService.updateOwnEmail(user.userId, user.role, dto.currentPassword, dto.newEmail);
        return { success: true };
    }
    async createBroker(dto, user) {
        const broker = await this.usersService.createBroker(user.role, dto.name, dto.email, dto.password);
        return broker;
    }
};
exports.UsersController = UsersController;
__decorate([
    (0, common_1.Get)('agents'),
    (0, roles_decorator_1.Roles)(user_entity_1.UserRole.BROKER),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "findAllAgents", null);
__decorate([
    (0, common_1.Get)('agents/roster'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "findAgentRoster", null);
__decorate([
    (0, common_1.Get)('me'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "findMe", null);
__decorate([
    (0, common_1.Post)('agents'),
    (0, roles_decorator_1.Roles)(user_entity_1.UserRole.BROKER),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_agent_dto_1.CreateAgentDto]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "createAgent", null);
__decorate([
    (0, common_1.Patch)('agents/:id/target'),
    (0, roles_decorator_1.Roles)(user_entity_1.UserRole.BROKER),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('monthlyTarget')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "setMonthlyTarget", null);
__decorate([
    (0, common_1.Patch)('agents/:id/dues'),
    (0, roles_decorator_1.Roles)(user_entity_1.UserRole.BROKER),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('monthlyDuesAmount')),
    __param(2, (0, common_1.Body)('duesStartDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, String]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "setMonthlyDues", null);
__decorate([
    (0, common_1.Patch)('agents/:id/profile'),
    (0, roles_decorator_1.Roles)(user_entity_1.UserRole.BROKER),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_agent_profile_dto_1.UpdateAgentProfileDto]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "updateAgentProfile", null);
__decorate([
    (0, common_1.Post)('agents/:id/reset-password'),
    (0, roles_decorator_1.Roles)(user_entity_1.UserRole.BROKER),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "brokerResetPassword", null);
__decorate([
    (0, common_1.Patch)('agents/:id/active'),
    (0, roles_decorator_1.Roles)(user_entity_1.UserRole.BROKER),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('isActive')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Boolean]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "setActive", null);
__decorate([
    (0, common_1.Delete)('agents/:id'),
    (0, roles_decorator_1.Roles)(user_entity_1.UserRole.BROKER),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "removeAgent", null);
__decorate([
    (0, common_1.Patch)('change-password'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [change_password_dto_1.ChangePasswordDto, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "changePassword", null);
__decorate([
    (0, common_1.Patch)('change-email'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [change_email_dto_1.ChangeEmailDto, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "changeEmail", null);
__decorate([
    (0, common_1.Post)('brokers'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_broker_dto_1.CreateBrokerDto, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "createBroker", null);
exports.UsersController = UsersController = __decorate([
    (0, common_1.Controller)('users'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [users_service_1.UsersService])
], UsersController);
//# sourceMappingURL=users.controller.js.map