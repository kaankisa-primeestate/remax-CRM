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
exports.CommissionsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const commission_entity_1 = require("./commission.entity");
const commission_payment_entity_1 = require("./commission-payment.entity");
const bank_transaction_entity_1 = require("../bank-accounts/bank-transaction.entity");
const transaction_entity_1 = require("../transactions/transaction.entity");
const cheque_note_entity_1 = require("../cheque-notes/cheque-note.entity");
let CommissionsService = class CommissionsService {
    constructor(commissionsRepository, paymentsRepository, bankTransactionRepository, transactionRepository, chequeNoteRepository) {
        this.commissionsRepository = commissionsRepository;
        this.paymentsRepository = paymentsRepository;
        this.bankTransactionRepository = bankTransactionRepository;
        this.transactionRepository = transactionRepository;
        this.chequeNoteRepository = chequeNoteRepository;
    }
    calculateAmounts(dto) {
        const grossCommission = (dto.transactionAmount * dto.commissionRate) / 100;
        const agentGrossShare = (grossCommission * dto.agentSharePercent) / 100;
        const withholding = (agentGrossShare * (dto.withholdingTaxPercent || 0)) / 100;
        const vat = (agentGrossShare * (dto.vatPercent || 0)) / 100;
        const penalty = dto.penaltyAmount || 0;
        const netPayable = agentGrossShare - withholding - vat - penalty;
        return { grossCommission, agentGrossShare, netPayable };
    }
    async create(dto, requestingUserId, requestingUserRole) {
        let agentId = dto.agentId;
        if (requestingUserRole === 'agent') {
            agentId = requestingUserId;
        }
        else if (!agentId && !dto.transactionId) {
            throw new common_1.ForbiddenException('Broker bir danışman seçmelidir (agentId zorunlu)');
        }
        if (dto.transactionId) {
            const transaction = await this.transactionRepository.findOne({
                where: { id: dto.transactionId },
            });
            if (!transaction) {
                throw new common_1.NotFoundException('İşlem bulunamadı');
            }
            if (transaction.collaboratorAgentId && transaction.splitFinalizedAt) {
                const ownerAgentId = transaction.agentId;
                const collaboratorAgentId = transaction.collaboratorAgentId;
                const ownerSplitPercent = Number(transaction.commissionSplitPercentage ?? 50);
                const collaboratorSplitPercent = 100 - ownerSplitPercent;
                const baseSharePercent = Number(dto.agentSharePercent);
                const ownerDto = {
                    ...dto,
                    agentSharePercent: (baseSharePercent * ownerSplitPercent) / 100,
                };
                const { grossCommission: g1, agentGrossShare: a1, netPayable: n1 } = this.calculateAmounts(ownerDto);
                const ownerCommission = this.commissionsRepository.create({
                    ...dto,
                    agentId: ownerAgentId,
                    agentSharePercent: ownerDto.agentSharePercent,
                    grossCommission: g1,
                    agentGrossShare: a1,
                    netPayable: n1,
                    withholdingTaxPercent: dto.withholdingTaxPercent || 0,
                    vatPercent: dto.vatPercent || 0,
                    penaltyAmount: dto.penaltyAmount || 0,
                    transactionId: transaction.id,
                    collaboratorAgentId: collaboratorAgentId,
                    collaboratorSplitPercent: ownerSplitPercent,
                });
                const collaboratorDto = {
                    ...dto,
                    agentSharePercent: (baseSharePercent * collaboratorSplitPercent) / 100,
                };
                const { grossCommission: g2, agentGrossShare: a2, netPayable: n2 } = this.calculateAmounts(collaboratorDto);
                const collaboratorCommission = this.commissionsRepository.create({
                    ...dto,
                    agentId: collaboratorAgentId,
                    agentSharePercent: collaboratorDto.agentSharePercent,
                    grossCommission: g2,
                    agentGrossShare: a2,
                    netPayable: n2,
                    withholdingTaxPercent: dto.withholdingTaxPercent || 0,
                    vatPercent: dto.vatPercent || 0,
                    penaltyAmount: dto.penaltyAmount || 0,
                    transactionId: transaction.id,
                    collaboratorAgentId: ownerAgentId,
                    collaboratorSplitPercent: collaboratorSplitPercent,
                });
                return this.commissionsRepository.save([ownerCommission, collaboratorCommission]);
            }
        }
        if (!agentId) {
            throw new common_1.ForbiddenException('Broker bir danışman seçmelidir (agentId zorunlu)');
        }
        const { grossCommission, agentGrossShare, netPayable } = this.calculateAmounts(dto);
        const commission = this.commissionsRepository.create({
            ...dto,
            agentId,
            grossCommission,
            agentGrossShare,
            netPayable,
            withholdingTaxPercent: dto.withholdingTaxPercent || 0,
            vatPercent: dto.vatPercent || 0,
            penaltyAmount: dto.penaltyAmount || 0,
        });
        const saved = await this.commissionsRepository.save(commission);
        return [saved];
    }
    async findAll(requestingUserId, requestingUserRole, filters) {
        const query = this.commissionsRepository.createQueryBuilder('commission');
        if (requestingUserRole === 'agent') {
            query.andWhere('commission.agentId = :agentId', {
                agentId: requestingUserId,
            });
        }
        else if (filters.agentId) {
            query.andWhere('commission.agentId = :agentId', {
                agentId: filters.agentId,
            });
        }
        if (filters.status) {
            query.andWhere('commission.status = :status', {
                status: filters.status,
            });
        }
        if (filters.fromDate) {
            query.andWhere('commission.dueDate >= :fromDate', {
                fromDate: filters.fromDate,
            });
        }
        if (filters.toDate) {
            query.andWhere('commission.dueDate <= :toDate', {
                toDate: filters.toDate,
            });
        }
        query.orderBy('commission.dueDate', 'DESC');
        return query.getMany();
    }
    async findOne(id, requestingUserId, requestingUserRole) {
        const commission = await this.commissionsRepository.findOne({
            where: { id },
        });
        if (!commission) {
            throw new common_1.NotFoundException('Komisyon kaydı bulunamadı');
        }
        if (requestingUserRole === 'agent' &&
            commission.agentId !== requestingUserId) {
            throw new common_1.ForbiddenException('Bu kayda erişim yetkiniz yok');
        }
        return commission;
    }
    async update(id, dto, requestingUserId, requestingUserRole) {
        const commission = await this.findOne(id, requestingUserId, requestingUserRole);
        if (requestingUserRole === 'agent' && dto.status) {
            throw new common_1.ForbiddenException('Durum değişikliğini sadece Broker yapabilir');
        }
        const statusChanging = dto.status !== undefined && dto.status !== commission.status;
        const merged = { ...commission, ...dto };
        const { grossCommission, agentGrossShare, netPayable } = this.calculateAmounts(merged);
        Object.assign(commission, dto, {
            grossCommission,
            agentGrossShare,
            netPayable,
        });
        if (statusChanging) {
            commission.statusChangedAt = new Date();
        }
        return this.commissionsRepository.save(commission);
    }
    async remove(id, requestingUserRole) {
        if (requestingUserRole !== 'broker') {
            throw new common_1.ForbiddenException('Sadece Broker silebilir');
        }
        const commission = await this.commissionsRepository.findOne({
            where: { id },
        });
        if (!commission) {
            throw new common_1.NotFoundException('Komisyon kaydı bulunamadı');
        }
        await this.commissionsRepository.remove(commission);
    }
    async summary(requestingUserId, requestingUserRole, filters) {
        const commissions = await this.findAll(requestingUserId, requestingUserRole, filters);
        const totalGross = commissions.reduce((sum, c) => sum + Number(c.grossCommission), 0);
        const totalNetPayable = commissions.reduce((sum, c) => sum + Number(c.netPayable), 0);
        const totalPaid = commissions
            .filter((c) => c.status === 'paid')
            .reduce((sum, c) => sum + Number(c.netPayable), 0);
        const totalPending = commissions
            .filter((c) => c.status !== 'paid')
            .reduce((sum, c) => sum + Number(c.netPayable), 0);
        return {
            count: commissions.length,
            totalGross,
            totalNetPayable,
            totalPaid,
            totalPending,
        };
    }
    async getPayments(commissionId) {
        return this.paymentsRepository.find({
            where: { commissionId },
            order: { date: 'DESC', createdAt: 'DESC' },
        });
    }
    async addPayment(commissionId, dto, requestingUserRole) {
        if (requestingUserRole !== 'broker') {
            throw new common_1.ForbiddenException('Sadece Broker ödeme kaydedebilir');
        }
        const commission = await this.commissionsRepository.findOne({ where: { id: commissionId } });
        if (!commission) {
            throw new common_1.NotFoundException('Komisyon kaydı bulunamadı');
        }
        const payment = this.paymentsRepository.create({ ...dto, commissionId });
        const saved = await this.paymentsRepository.save(payment);
        if (dto.paymentMethod === 'cheque' || dto.paymentMethod === 'note') {
            const chequeNote = this.chequeNoteRepository.create({
                type: dto.paymentMethod === 'cheque' ? cheque_note_entity_1.ChequeNoteType.CHEQUE : cheque_note_entity_1.ChequeNoteType.NOTE,
                direction: cheque_note_entity_1.ChequeNoteDirection.PAYABLE,
                amount: dto.amount,
                dueDate: dto.chequeDueDate,
                drawerName: dto.chequeDrawerName || commission.propertyTitle || 'Danışman Ödemesi',
                bankAccountId: dto.bankAccountId || null,
                status: cheque_note_entity_1.ChequeNoteStatus.PORTFOLIO,
                notes: `Komisyon ödemesi: ${commission.propertyTitle || commission.id}`,
            });
            await this.chequeNoteRepository.save(chequeNote);
        }
        else if (dto.bankAccountId) {
            const transaction = this.bankTransactionRepository.create({
                bankAccountId: dto.bankAccountId,
                type: bank_transaction_entity_1.BankTransactionType.WITHDRAWAL,
                amount: dto.amount,
                date: dto.date,
                description: `Komisyon ödemesi: ${commission.propertyTitle || commission.id}`,
                source: 'commission_payment',
                sourceId: saved.id,
            });
            await this.bankTransactionRepository.save(transaction);
        }
        const allPayments = await this.getPayments(commissionId);
        const totalPaid = allPayments.reduce((sum, p) => sum + Number(p.amount), 0);
        if (totalPaid >= Number(commission.netPayable) && commission.status !== 'paid') {
            commission.status = 'paid';
            commission.statusChangedAt = new Date();
            await this.commissionsRepository.save(commission);
        }
        return saved;
    }
    async removePayment(paymentId, requestingUserRole) {
        if (requestingUserRole !== 'broker') {
            throw new common_1.ForbiddenException('Sadece Broker ödeme silebilir');
        }
        const payment = await this.paymentsRepository.findOne({ where: { id: paymentId } });
        if (!payment) {
            throw new common_1.NotFoundException('Ödeme bulunamadı');
        }
        await this.bankTransactionRepository.delete({ source: 'commission_payment', sourceId: paymentId });
        await this.paymentsRepository.remove(payment);
        const commission = await this.commissionsRepository.findOne({ where: { id: payment.commissionId } });
        if (commission && commission.status === 'paid') {
            commission.status = 'approved';
            commission.statusChangedAt = new Date();
            await this.commissionsRepository.save(commission);
        }
    }
    async suggestRate(agentId, newTransactionAmount, tierRules, fallbackRate) {
        if (!tierRules || tierRules.length === 0) {
            return { suggestedRate: fallbackRate, ytdVolume: 0, appliedTier: null };
        }
        const yearStart = `${new Date().getFullYear()}-01-01`;
        const yearEnd = `${new Date().getFullYear()}-12-31`;
        const ytdCommissions = await this.commissionsRepository
            .createQueryBuilder('c')
            .where('c.agentId = :agentId', { agentId })
            .andWhere('c.dueDate BETWEEN :from AND :to', { from: yearStart, to: yearEnd })
            .getMany();
        const ytdVolume = ytdCommissions.reduce((sum, c) => sum + Number(c.transactionAmount), 0);
        const cumulativeVolume = ytdVolume + Number(newTransactionAmount);
        const sortedTiers = [...tierRules].sort((a, b) => a.threshold - b.threshold);
        let appliedTier = null;
        for (const tier of sortedTiers) {
            if (cumulativeVolume >= tier.threshold) {
                appliedTier = tier;
            }
        }
        return {
            suggestedRate: appliedTier ? appliedTier.rate : fallbackRate,
            ytdVolume,
            appliedTier,
        };
    }
};
exports.CommissionsService = CommissionsService;
exports.CommissionsService = CommissionsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(commission_entity_1.Commission)),
    __param(1, (0, typeorm_1.InjectRepository)(commission_payment_entity_1.CommissionPayment)),
    __param(2, (0, typeorm_1.InjectRepository)(bank_transaction_entity_1.BankTransaction)),
    __param(3, (0, typeorm_1.InjectRepository)(transaction_entity_1.Transaction)),
    __param(4, (0, typeorm_1.InjectRepository)(cheque_note_entity_1.ChequeNote)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], CommissionsService);
//# sourceMappingURL=commissions.service.js.map