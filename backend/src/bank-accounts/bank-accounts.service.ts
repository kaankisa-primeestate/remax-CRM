import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, In, Repository } from 'typeorm';
import { BankAccount } from './bank-account.entity';
import { BankTransaction, BankTransactionType } from './bank-transaction.entity';
import { CreateBankAccountDto } from './dto/create-bank-account.dto';
import { CreateBankTransactionDto } from './dto/create-bank-transaction.dto';

@Injectable()
export class BankAccountsService {
  constructor(
    @InjectRepository(BankAccount) private readonly accountRepo: Repository<BankAccount>,
    @InjectRepository(BankTransaction) private readonly transactionRepo: Repository<BankTransaction>,
  ) {}

  async create(dto: CreateBankAccountDto): Promise<BankAccount> {
    const account = this.accountRepo.create({ ...dto, currency: dto.currency || 'TRY' } as DeepPartial<BankAccount>);
    return this.accountRepo.save(account);
  }

  // Tum hesaplari, HER BIRININ CANLI BAKIYESIYLE birlikte dondurur.
  // Bakiye hic bir yerde saklanmaz -- her cagride hareketlerden toplanir,
  // boylece asla senkron kaymasi olmaz.
  async findAll(includeInactive = false): Promise<any[]> {
    const accounts = await this.accountRepo.find({
      where: includeInactive ? {} : { isActive: true },
      order: { createdAt: 'ASC' },
    });
    if (accounts.length === 0) return [];

    const allTransactions = await this.transactionRepo.find({
      where: { bankAccountId: In(accounts.map((a) => a.id)) },
    });

    return accounts.map((account) => {
      const txs = allTransactions.filter((t) => t.bankAccountId === account.id);
      const balance = txs.reduce((sum, t) => {
        const amt = Number(t.amount);
        return t.type === BankTransactionType.DEPOSIT ? sum + amt : sum - amt;
      }, 0);
      return { ...account, balance };
    });
  }

  async setActive(id: string, isActive: boolean): Promise<BankAccount> {
    const account = await this.accountRepo.findOne({ where: { id } });
    if (!account) {
      throw new NotFoundException('Banka hesabı bulunamadı');
    }
    account.isActive = isActive;
    return this.accountRepo.save(account);
  }

  async findTransactions(bankAccountId: string): Promise<BankTransaction[]> {
    const account = await this.accountRepo.findOne({ where: { id: bankAccountId } });
    if (!account) {
      throw new NotFoundException('Banka hesabı bulunamadı');
    }
    return this.transactionRepo.find({
      where: { bankAccountId },
      order: { date: 'DESC', createdAt: 'DESC' },
    });
  }

  async addTransaction(
    bankAccountId: string,
    dto: CreateBankTransactionDto,
  ): Promise<BankTransaction> {
    const account = await this.accountRepo.findOne({ where: { id: bankAccountId } });
    if (!account) {
      throw new NotFoundException('Banka hesabı bulunamadı');
    }
    const transaction = this.transactionRepo.create({
      ...dto,
      bankAccountId,
      source: 'manual',
    });
    return this.transactionRepo.save(transaction);
  }

  async removeTransaction(id: string): Promise<void> {
    const transaction = await this.transactionRepo.findOne({ where: { id } });
    if (!transaction) {
      throw new NotFoundException('Hareket bulunamadı');
    }
    await this.transactionRepo.remove(transaction);
  }
}
