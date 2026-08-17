import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction, TransactionStage } from './transaction.entity';
import { TransactionNote } from './transaction-note.entity';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { AddNoteDto } from './dto/add-note.dto';
import { Property, PropertyStatus } from '../portfolios/property.entity';
import { CurrentUserPayload } from '../auth/current-user.decorator';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transaction) private readonly transactionRepo: Repository<Transaction>,
    @InjectRepository(TransactionNote) private readonly noteRepo: Repository<TransactionNote>,
    @InjectRepository(Property) private readonly propertyRepo: Repository<Property>,
  ) {}

  // Islemler her zaman olusturan danismana aittir -- Mahremiyet Duvari:
  // Broker tum islemleri gorebilir, Danisman sadece kendisininkini.
  async create(dto: CreateTransactionDto, currentUser: CurrentUserPayload): Promise<Transaction> {
    if (!dto.customerId && !dto.externalCustomerLabel) {
      throw new BadRequestException('Müşteri seçin ya da harici müşteri bilgisi girin');
    }
    // Portfoy BILEREK zorunlu tutulmuyor -- bir Talep, henuz hicbir
    // portfoy belirlenmeden acilabilir (senaryo: "Kadikoy 3+1 ariyor"
    // gibi sadece kriter bilgisiyle baslar, portfoy sureç ilerledikce
    // eslesir/eklenir).
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

    // Tapu Onay Akisi: sadece Broker "dealApproved: true" ayarlayabilir,
    // ve sadece islem "Kapanis" asamasindaysa (asama da ayni istekte
    // degisiyor olabilir, o yuzden sonucu hesaplayip kontrol ediyoruz).
    if (dto.dealApproved === true && currentUser.role !== 'broker') {
      throw new ForbiddenException('Bu işlemi sadece Broker onaylayabilir');
    }
    const resultingStage = dto.stage ?? transaction.stage;
    if (dto.dealApproved === true && resultingStage !== TransactionStage.CLOSED) {
      throw new ForbiddenException('Onay sadece Kapanış aşamasındaki işlemler için yapılabilir');
    }

    const stageChanging = dto.stage !== undefined && dto.stage !== transaction.stage;
    const justClosed = stageChanging && dto.stage === TransactionStage.CLOSED;
    const dealJustApproved = dto.dealApproved === true && !transaction.dealApproved;

    Object.assign(transaction, dto);
    if (stageChanging) {
      transaction.stageChangedAt = new Date();
    }
    if (dealJustApproved) {
      transaction.dealApprovedAt = new Date();
    }
    const saved = await this.transactionRepo.save(transaction);

    // Kapanis'a gecince, baglantili (harici OLMAYAN) portfoyu otomatik
    // Satildi/Kiralandi yap -- danismanin elle guncellemeyi unutma
    // riskini ortadan kaldirir. Harici portfoylerde (externalPropertyLabel)
    // bizim sistemimizde bir Property kaydi olmadigi icin bu adim atlanir.
    if (justClosed && saved.propertyId) {
      const property = await this.propertyRepo.findOne({ where: { id: saved.propertyId } });
      if (property) {
        property.status = property.listingType === 'rent' ? PropertyStatus.RENTED : PropertyStatus.SOLD;
        property.statusChangedAt = new Date();
        await this.propertyRepo.save(property);
      }
    }

    return saved;
  }

  async remove(id: string, currentUser: CurrentUserPayload): Promise<void> {
    const transaction = await this.findOneOwned(id, currentUser);
    await this.noteRepo.delete({ transactionId: id });
    await this.transactionRepo.remove(transaction);
  }

  // --- Zaman Akisi: tarihli not gecmisi ---

  async getNotes(transactionId: string, currentUser: CurrentUserPayload): Promise<TransactionNote[]> {
    await this.findOneOwned(transactionId, currentUser);
    return this.noteRepo.find({ where: { transactionId }, order: { createdAt: 'DESC' } });
  }

  async addNote(
    transactionId: string,
    dto: AddNoteDto,
    currentUser: CurrentUserPayload,
  ): Promise<TransactionNote> {
    await this.findOneOwned(transactionId, currentUser);
    const note = this.noteRepo.create({
      transactionId,
      text: dto.text,
      authorId: currentUser.userId,
      authorName: currentUser.name,
    });
    return this.noteRepo.save(note);
  }
}
