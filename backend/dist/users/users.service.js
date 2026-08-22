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
var UsersService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const user_entity_1 = require("./user.entity");
const customer_entity_1 = require("../customers/customer.entity");
const property_entity_1 = require("../portfolios/property.entity");
const transaction_entity_1 = require("../transactions/transaction.entity");
const SALT_ROUNDS = 10;
let UsersService = UsersService_1 = class UsersService {
    constructor(userRepo, customerRepo, propertyRepo, transactionRepo) {
        this.userRepo = userRepo;
        this.customerRepo = customerRepo;
        this.propertyRepo = propertyRepo;
        this.transactionRepo = transactionRepo;
        this.logger = new common_1.Logger(UsersService_1.name);
    }
    async onModuleInit() {
        const count = await this.userRepo.count();
        if (count > 0)
            return;
        const defaultEmail = process.env.DEFAULT_BROKER_EMAIL || 'admin@remax.local';
        const defaultPassword = process.env.DEFAULT_BROKER_PASSWORD || 'broker123';
        const passwordHash = await bcrypt.hash(defaultPassword, SALT_ROUNDS);
        await this.userRepo.save(this.userRepo.create({
            name: 'Ofis Sahibi',
            email: defaultEmail,
            passwordHash,
            role: user_entity_1.UserRole.BROKER,
        }));
        this.logger.warn(`İlk kurulum: varsayılan Broker hesabı oluşturuldu → e-posta: ${defaultEmail} / şifre: ${defaultPassword} — LÜTFEN GİRİŞ YAPTIKTAN SONRA ŞİFRENİZİ DEĞİŞTİRİN.`);
    }
    async findByEmail(email) {
        return this.userRepo.findOne({ where: { email } });
    }
    async findById(id) {
        return this.userRepo.findOne({ where: { id } });
    }
    async changePassword(userId, currentPassword, newPassword) {
        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (!user) {
            throw new common_1.NotFoundException('Kullanici bulunamadi');
        }
        const matches = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!matches) {
            throw new common_1.UnauthorizedException('Mevcut sifre hatali');
        }
        user.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
        await this.userRepo.save(user);
    }
    async setResetToken(userId, tokenHash, expiresAt) {
        await this.userRepo.update(userId, { resetTokenHash: tokenHash, resetTokenExpiresAt: expiresAt });
    }
    async setPasswordAndClearResetToken(userId, newPassword) {
        const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
        await this.userRepo.update(userId, { passwordHash, resetTokenHash: null, resetTokenExpiresAt: null });
    }
    async brokerResetPassword(agentId) {
        const user = await this.userRepo.findOne({ where: { id: agentId } });
        if (!user) {
            throw new common_1.NotFoundException('Danışman bulunamadı');
        }
        const tempPassword = crypto.randomBytes(6).toString('base64url');
        user.passwordHash = await bcrypt.hash(tempPassword, SALT_ROUNDS);
        user.resetTokenHash = null;
        user.resetTokenExpiresAt = null;
        await this.userRepo.save(user);
        return tempPassword;
    }
    async setActive(agentId, isActive) {
        const user = await this.userRepo.findOne({ where: { id: agentId } });
        if (!user) {
            throw new common_1.NotFoundException('Danışman bulunamadı');
        }
        user.isActive = isActive;
        await this.userRepo.save(user);
    }
    async removeAgent(agentId) {
        const user = await this.userRepo.findOne({ where: { id: agentId } });
        if (!user) {
            throw new common_1.NotFoundException('Danışman bulunamadı');
        }
        const [customerCount, propertyCount, transactionCount] = await Promise.all([
            this.customerRepo.count({ where: { agentId } }),
            this.propertyRepo.count({ where: { agentId } }),
            this.transactionRepo.count({ where: { agentId } }),
        ]);
        if (customerCount > 0 || propertyCount > 0 || transactionCount > 0) {
            throw new common_1.ConflictException(`Bu danışmanın ${customerCount} müşteri, ${propertyCount} portföy, ${transactionCount} işlem kaydı var — güvenlik nedeniyle silinemez. Bunun yerine "Pasife Al" kullanın.`);
        }
        await this.userRepo.remove(user);
    }
    async createAgent(dto) {
        const existing = await this.findByEmail(dto.email);
        if (existing) {
            throw new common_1.ConflictException('Bu e-posta ile kayıtlı bir kullanıcı zaten var');
        }
        const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
        const user = await this.userRepo.save(this.userRepo.create({
            name: dto.name,
            email: dto.email,
            passwordHash,
            role: user_entity_1.UserRole.AGENT,
            phone: dto.phone,
            address: dto.address || null,
            birthDate: dto.birthDate || null,
            nationalId: dto.nationalId || null,
            companyName: dto.companyName || null,
            taxId: dto.taxId || null,
            profilePhotoUrl: dto.profilePhotoUrl || null,
            companyType: dto.companyType || null,
            taxOffice: dto.taxOffice || null,
            mykCertificateNo: dto.mykCertificateNo || null,
            realEstateLicenseUrl: dto.realEstateLicenseUrl || null,
            officeName: dto.officeName || 'RE/MAX Bostancı',
            commissionShareType: dto.commissionShareType || null,
            commissionSharePercentage: dto.commissionSharePercentage ?? null,
            contractStartDate: dto.contractStartDate || null,
            mentorAgentId: dto.mentorAgentId || null,
            monthlyDuesAmount: dto.monthlyDuesAmount ?? null,
            powerStartCompleted: dto.powerStartCompleted ?? false,
            powerStartCertificateNo: dto.powerStartCertificateNo || null,
            powerStartCertificateDate: dto.powerStartCertificateDate || null,
        }));
        const { passwordHash: _omit, ...safeUser } = user;
        return safeUser;
    }
    async findAllAgents() {
        const agents = await this.userRepo.find({
            where: { role: user_entity_1.UserRole.AGENT },
            order: { name: 'ASC' },
        });
        return agents.map(({ passwordHash, ...rest }) => rest);
    }
    async findAgentRoster() {
        const agents = await this.userRepo.find({
            where: { role: user_entity_1.UserRole.AGENT },
            order: { name: 'ASC' },
        });
        return agents.map((a) => ({ id: a.id, name: a.name }));
    }
    async setMonthlyTarget(agentId, monthlyTarget) {
        const agent = await this.userRepo.findOne({ where: { id: agentId, role: user_entity_1.UserRole.AGENT } });
        if (!agent) {
            throw new common_1.NotFoundException('Danışman bulunamadı');
        }
        agent.monthlyTarget = monthlyTarget;
        const saved = await this.userRepo.save(agent);
        const { passwordHash, ...rest } = saved;
        return rest;
    }
    async setMonthlyDues(agentId, monthlyDuesAmount) {
        const agent = await this.userRepo.findOne({ where: { id: agentId, role: user_entity_1.UserRole.AGENT } });
        if (!agent) {
            throw new common_1.NotFoundException('Danışman bulunamadı');
        }
        agent.monthlyDuesAmount = monthlyDuesAmount;
        const saved = await this.userRepo.save(agent);
        const { passwordHash, ...rest } = saved;
        return rest;
    }
    async updateAgentProfile(agentId, dto) {
        const agent = await this.userRepo.findOne({ where: { id: agentId, role: user_entity_1.UserRole.AGENT } });
        if (!agent) {
            throw new common_1.NotFoundException('Danışman bulunamadı');
        }
        Object.assign(agent, dto);
        const saved = await this.userRepo.save(agent);
        const { passwordHash, ...rest } = saved;
        return rest;
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = UsersService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(1, (0, typeorm_1.InjectRepository)(customer_entity_1.Customer)),
    __param(2, (0, typeorm_1.InjectRepository)(property_entity_1.Property)),
    __param(3, (0, typeorm_1.InjectRepository)(transaction_entity_1.Transaction)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], UsersService);
//# sourceMappingURL=users.service.js.map