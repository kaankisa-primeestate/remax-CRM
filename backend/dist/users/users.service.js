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
const user_entity_1 = require("./user.entity");
const SALT_ROUNDS = 10;
let UsersService = UsersService_1 = class UsersService {
    constructor(userRepo) {
        this.userRepo = userRepo;
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
            nationalId: dto.nationalId,
            companyName: dto.companyName,
            taxId: dto.taxId,
            profilePhotoUrl: dto.profilePhotoUrl,
            companyType: dto.companyType,
            taxOffice: dto.taxOffice,
            mykCertificateNo: dto.mykCertificateNo,
            realEstateLicenseUrl: dto.realEstateLicenseUrl,
            officeName: dto.officeName || 'RE/MAX Bostancı',
            commissionShareType: dto.commissionShareType,
            commissionSharePercentage: dto.commissionSharePercentage,
            contractStartDate: dto.contractStartDate,
            mentorAgentId: dto.mentorAgentId || null,
            monthlyDuesAmount: dto.monthlyDuesAmount ?? null,
            powerStartCompleted: dto.powerStartCompleted,
            powerStartCertificateNo: dto.powerStartCertificateNo,
            powerStartCertificateDate: dto.powerStartCertificateDate,
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
    __metadata("design:paramtypes", [typeorm_2.Repository])
], UsersService);
//# sourceMappingURL=users.service.js.map