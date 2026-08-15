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
exports.Property = exports.PropertyStatus = exports.ListingType = exports.PropertyType = void 0;
const typeorm_1 = require("typeorm");
var PropertyType;
(function (PropertyType) {
    PropertyType["APARTMENT"] = "apartment";
    PropertyType["LAND"] = "land";
    PropertyType["FIELD"] = "field";
    PropertyType["COMMERCIAL"] = "commercial";
    PropertyType["TIMESHARE"] = "timeshare";
    PropertyType["VILLA"] = "villa";
    PropertyType["OFFICE"] = "office";
    PropertyType["BUILDING"] = "building";
    PropertyType["PROJECT"] = "project";
    PropertyType["HOTEL"] = "hotel";
})(PropertyType || (exports.PropertyType = PropertyType = {}));
var ListingType;
(function (ListingType) {
    ListingType["SALE"] = "sale";
    ListingType["RENT"] = "rent";
})(ListingType || (exports.ListingType = ListingType = {}));
var PropertyStatus;
(function (PropertyStatus) {
    PropertyStatus["PENDING_APPROVAL"] = "pending_approval";
    PropertyStatus["NEEDS_REVISION"] = "needs_revision";
    PropertyStatus["ACTIVE"] = "active";
    PropertyStatus["PASSIVE"] = "passive";
    PropertyStatus["SOLD"] = "sold";
    PropertyStatus["RENTED"] = "rented";
})(PropertyStatus || (exports.PropertyStatus = PropertyStatus = {}));
let Property = class Property {
};
exports.Property = Property;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Property.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Property.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: PropertyType }),
    __metadata("design:type", String)
], Property.prototype, "propertyType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: ListingType }),
    __metadata("design:type", String)
], Property.prototype, "listingType", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Property.prototype, "province", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Property.prototype, "district", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Property.prototype, "neighborhood", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'numeric', precision: 10, scale: 2 }),
    __metadata("design:type", Number)
], Property.prototype, "areaM2", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'numeric', precision: 14, scale: 2 }),
    __metadata("design:type", Number)
], Property.prototype, "price", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 'TRY' }),
    __metadata("design:type", String)
], Property.prototype, "priceCurrency", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Property.prototype, "deedStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], Property.prototype, "mortgageEligible", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'date', nullable: true }),
    __metadata("design:type", Object)
], Property.prototype, "contractEndDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], Property.prototype, "revisionNote", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], Property.prototype, "rooms", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', nullable: true }),
    __metadata("design:type", Object)
], Property.prototype, "bathrooms", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], Property.prototype, "floor", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], Property.prototype, "heatingType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'numeric', precision: 10, scale: 2, nullable: true }),
    __metadata("design:type", Object)
], Property.prototype, "dues", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], Property.prototype, "hasPool", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], Property.prototype, "hasGym", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], Property.prototype, "hasSecurity", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], Property.prototype, "hasParking", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], Property.prototype, "nearMetro", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], Property.prototype, "view", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], Property.prototype, "facade", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', nullable: true }),
    __metadata("design:type", Object)
], Property.prototype, "buildingAge", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: PropertyStatus, default: PropertyStatus.ACTIVE }),
    __metadata("design:type", String)
], Property.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Object)
], Property.prototype, "statusChangedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-array', nullable: true }),
    __metadata("design:type", Object)
], Property.prototype, "photoUrls", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], Property.prototype, "notes", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], Property.prototype, "extraAttributes", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], Property.prototype, "agentId", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Property.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Property.prototype, "updatedAt", void 0);
exports.Property = Property = __decorate([
    (0, typeorm_1.Entity)('properties')
], Property);
//# sourceMappingURL=property.entity.js.map