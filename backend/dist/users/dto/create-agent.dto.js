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
exports.CreateAgentDto = void 0;
const class_validator_1 = require("class-validator");
const user_entity_1 = require("../user.entity");
class CreateAgentDto {
}
exports.CreateAgentDto = CreateAgentDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Ad Soyad zorunludur' }),
    __metadata("design:type", String)
], CreateAgentDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(11, 11, { message: 'T.C. Kimlik No 11 haneli olmalıdır' }),
    __metadata("design:type", String)
], CreateAgentDto.prototype, "nationalId", void 0);
__decorate([
    (0, class_validator_1.IsEmail)({}, { message: 'Geçerli bir kurumsal e-posta adresi girin' }),
    __metadata("design:type", String)
], CreateAgentDto.prototype, "email", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Cep telefonu zorunludur' }),
    __metadata("design:type", String)
], CreateAgentDto.prototype, "phone", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Profil fotoğrafı zorunludur' }),
    __metadata("design:type", String)
], CreateAgentDto.prototype, "profilePhotoUrl", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(6, { message: 'Şifre en az 6 karakter olmalıdır' }),
    __metadata("design:type", String)
], CreateAgentDto.prototype, "password", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(user_entity_1.CompanyType, { message: 'Şirket türü seçin' }),
    __metadata("design:type", String)
], CreateAgentDto.prototype, "companyType", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Şirket unvanı zorunludur' }),
    __metadata("design:type", String)
], CreateAgentDto.prototype, "companyName", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Vergi dairesi zorunludur' }),
    __metadata("design:type", String)
], CreateAgentDto.prototype, "taxOffice", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Vergi kimlik no zorunludur' }),
    __metadata("design:type", String)
], CreateAgentDto.prototype, "taxId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'MYK Seviye 5 belge no zorunludur' }),
    __metadata("design:type", String)
], CreateAgentDto.prototype, "mykCertificateNo", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Taşınmaz Ticareti Yetki Belgesi zorunludur' }),
    __metadata("design:type", String)
], CreateAgentDto.prototype, "realEstateLicenseUrl", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateAgentDto.prototype, "officeName", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(user_entity_1.CommissionShareType, { message: 'Komisyon paylaşım tipi seçin' }),
    __metadata("design:type", String)
], CreateAgentDto.prototype, "commissionShareType", void 0);
__decorate([
    (0, class_validator_1.IsDateString)({}, { message: 'Sözleşme başlangıç tarihi zorunludur' }),
    __metadata("design:type", String)
], CreateAgentDto.prototype, "contractStartDate", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateAgentDto.prototype, "mentorAgentId", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)({ message: 'Power Start Eğitimi tamamlandı olarak işaretlenmelidir' }),
    __metadata("design:type", Boolean)
], CreateAgentDto.prototype, "powerStartCompleted", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Sertifika no zorunludur' }),
    __metadata("design:type", String)
], CreateAgentDto.prototype, "powerStartCertificateNo", void 0);
__decorate([
    (0, class_validator_1.IsDateString)({}, { message: 'Sertifika tarihi zorunludur' }),
    __metadata("design:type", String)
], CreateAgentDto.prototype, "powerStartCertificateDate", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateAgentDto.prototype, "address", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateAgentDto.prototype, "birthDate", void 0);
//# sourceMappingURL=create-agent.dto.js.map