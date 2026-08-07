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
exports.CreateInteractionDto = void 0;
const class_validator_1 = require("class-validator");
const interaction_entity_1 = require("../interaction.entity");
class CreateInteractionDto {
}
exports.CreateInteractionDto = CreateInteractionDto;
__decorate([
    (0, class_validator_1.IsEnum)(interaction_entity_1.InteractionType, { message: 'Geçerli bir görüşme tipi seçin' }),
    __metadata("design:type", String)
], CreateInteractionDto.prototype, "type", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Görüşme notu boş olamaz' }),
    __metadata("design:type", String)
], CreateInteractionDto.prototype, "notes", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateInteractionDto.prototype, "actionItems", void 0);
__decorate([
    (0, class_validator_1.IsDateString)({}, { message: 'Geçerli bir tarih girin (ISO 8601)' }),
    __metadata("design:type", String)
], CreateInteractionDto.prototype, "occurredAt", void 0);
//# sourceMappingURL=create-interaction.dto.js.map