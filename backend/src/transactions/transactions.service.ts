import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from './transaction.entity';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { CurrentUserPayload } from '../auth/current-user.decorator';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transaction) private readonly transactionRepo: Repository<Transaction>,
  ) {}

  // Islemler her zaman olusturan danismana aittir -- Mahremiyet Duvari:
  // Broker tum islemleri gorebilir, Danisman sadece kendisininkini.
  async create(dto: CreateTransactionDto, currentUser: CurrentUserPayload): Promise<Transaction> {
    const transaction = this.transactionRepo.create({
      ...dto,
      agentId: currentUser.userId,
      stageChangedAt: new Date(),
    });
    return this.transactionRepo.save(transaction);
  }

  async findAll(currentUser: CurrentUserPayload): Promise<Transaction[]> {
    const where = currentUser.role === 'agent' ? { agentId: currentUser.userId } : {};
    return this.transactionRepo.find({ where, order: { updatedAt: 'DESC' } });
  }

  private async findOneOwned(id: string, currentUser: CurrentUserPayload): Promise<Transaction> {
    const transaction = await this.transactionRepo.findOne({ where: { id } });
    if (!transaction) {
      throw new NotFoundException('İşlem bulunamadı');
    }
    if (currentUser.role === 'agent' && transaction.agentId !== currentUser.userId) {
      throw new ForbiddenException('Bu işleme erişim yetkiniz yok');
    }
    return transaction;
  }

  async update(
    id: string,
    dto: UpdateTransactionDto,
    currentUser: CurrentUserPayload,
  ): Promise<Transaction> {
    const transaction = await this.findOneOwned(id, currentUser);
    const stageChanging = dto.stage !== undefined && dto.stage !== transaction.stage;
    Object.assign(transaction, dto);
    if (stageChanging) {
      transaction.stageChangedAt = new Date();
    }
    return this.transactionRepo.save(transaction);
  }

  async remove(id: string, currentUser: CurrentUserPayload): Promise<void> {
    const transaction = await this.findOneOwned(id, currentUser);
    await this.transactionRepo.remove(transaction);
  }
}
