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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const users_service_1 = require("../users/users.service");
const mail_service_1 = require("../mail/mail.service");
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;
let AuthService = class AuthService {
    constructor(usersService, jwtService, mailService) {
        this.usersService = usersService;
        this.jwtService = jwtService;
        this.mailService = mailService;
    }
    async login(dto) {
        const user = await this.usersService.findByEmail(dto.email);
        if (!user) {
            throw new common_1.UnauthorizedException('E-posta veya şifre hatalı');
        }
        if (!user.isActive) {
            throw new common_1.ForbiddenException('Bu hesap pasif duruma alınmış. Lütfen Broker ile iletişime geçin.');
        }
        const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);
        if (!passwordMatches) {
            throw new common_1.UnauthorizedException('E-posta veya şifre hatalı');
        }
        const payload = {
            sub: user.id,
            role: user.role,
            name: user.name,
            email: user.email,
        };
        return {
            accessToken: this.jwtService.sign(payload),
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        };
    }
    async forgotPassword(email, frontendBaseUrl) {
        const user = await this.usersService.findByEmail(email);
        const smtpConfigured = this.mailService.isConfigured();
        if (!user) {
            return { emailSent: false, smtpConfigured };
        }
        const rawToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = await bcrypt.hash(rawToken, 10);
        await this.usersService.setResetToken(user.id, tokenHash, new Date(Date.now() + RESET_TOKEN_TTL_MS));
        const resetUrl = `${frontendBaseUrl}/sifre-sifirla?email=${encodeURIComponent(user.email)}&token=${rawToken}`;
        const sent = await this.mailService.sendPasswordResetEmail(user.email, resetUrl, user.name);
        return { emailSent: sent, smtpConfigured };
    }
    async resetPassword(email, token, newPassword) {
        const user = await this.usersService.findByEmail(email);
        if (!user || !user.resetTokenHash || !user.resetTokenExpiresAt) {
            throw new common_1.UnauthorizedException('Sıfırlama bağlantısı geçersiz veya süresi dolmuş.');
        }
        if (new Date() > new Date(user.resetTokenExpiresAt)) {
            throw new common_1.UnauthorizedException('Sıfırlama bağlantısının süresi dolmuş. Lütfen tekrar talep edin.');
        }
        const tokenMatches = await bcrypt.compare(token, user.resetTokenHash);
        if (!tokenMatches) {
            throw new common_1.UnauthorizedException('Sıfırlama bağlantısı geçersiz.');
        }
        await this.usersService.setPasswordAndClearResetToken(user.id, newPassword);
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        jwt_1.JwtService,
        mail_service_1.MailService])
], AuthService);
//# sourceMappingURL=auth.service.js.map