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
exports.Customer = exports.CustomerType = void 0;
const typeorm_1 = require("typeorm");
const interaction_entity_1 = require("./interaction.entity");
var CustomerType;
(function (CustomerType) {
    CustomerType["BUYER"] = "buyer";
    CustomerType["SELLER"] = "seller";
    CustomerType["TENANT"] = "tenant";
    CustomerType["LANDLORD"] = "landlord";
    CustomerType["INVESTOR"] = "investor";
})(CustomerType || (exports.CustomerType = CustomerType = {}));
let Customer = class Customer {
};
exports.Customer = Customer;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Customer.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Customer.prototype, "firstName", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Customer.prototype, "lastName", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], Customer.prototype, "phone", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Customer.prototype, "email", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Customer.prototype, "address", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: CustomerType }),
    __metadata("design:type", String)
], Customer.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'numeric', precision: 14, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], Customer.prototype, "budget", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 'TRY' }),
    __metadata("design:type", String)
], Customer.prototype, "budgetCurrency", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], Customer.prototype, "requirements", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], Customer.prototype, "notes", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], Customer.prototype, "preferredDistrict", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-array', nullable: true }),
    __metadata("design:type", Object)
], Customer.prototype, "preferredRooms", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', nullable: true }),
    __metadata("design:type", Object)
], Customer.prototype, "wantsSeaView", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', nullable: true }),
    __metadata("design:type", Object)
], Customer.prototype, "wantsNearMetro", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], Customer.prototype, "propertyInterest", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-array', nullable: true }),
    __metadata("design:type", Object)
], Customer.prototype, "preferredDistricts", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], Customer.prototype, "purchaseTimeline", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: 'new_contact' }),
    __metadata("design:type", String)
], Customer.prototype, "pipelineStage", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], Customer.prototype, "leadSource", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], Customer.prototype, "agentId", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => interaction_entity_1.Interaction, (interaction) => interaction.customer, {
        cascade: true,
    }),
    __metadata("design:type", Array)
], Customer.prototype, "interactions", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Customer.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Customer.prototype, "updatedAt", void 0);
exports.Customer = Customer = __decorate([
    (0, typeorm_1.Entity)('customers')
], Customer);
//# sourceMappingURL=customer.entity.js.map