"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommissionsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const commission_entity_1 = require("./commission.entity");
const commission_payment_entity_1 = require("./commission-payment.entity");
const bank_transaction_entity_1 = require("../bank-accounts/bank-transaction.entity");
const transaction_entity_1 = require("../transactions/transaction.entity");
const cheque_note_entity_1 = require("../cheque-notes/cheque-note.entity");
const users_module_1 = require("../users/users.module");
const commissions_service_1 = require("./commissions.service");
const commissions_controller_1 = require("./commissions.controller");
let CommissionsModule = class CommissionsModule {
};
exports.CommissionsModule = CommissionsModule;
exports.CommissionsModule = CommissionsModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([commission_entity_1.Commission, commission_payment_entity_1.CommissionPayment, bank_transaction_entity_1.BankTransaction, transaction_entity_1.Transaction, cheque_note_entity_1.ChequeNote]), users_module_1.UsersModule],
        providers: [commissions_service_1.CommissionsService],
        controllers: [commissions_controller_1.CommissionsController],
        exports: [commissions_service_1.CommissionsService],
    })
], CommissionsModule);
//# sourceMappingURL=commissions.module.js.map