import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction, TransactionStage, OfferStatus, DeedChecklistItem } from './transaction.entity';
import { TransactionNote } from './transaction-note.entity';
import { TransactionDocument } from './transaction-document.entity';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { AddNoteDto } from './dto/add-note.dto';
import { AddDocumentDto } from './dto/add-document.dto';
import { UpdateSplitDto } from './dto/update-split.dto';
import { Property, PropertyStatus } from '../portfolios/property.entity';
import { Customer } from '../customers/customer.entity';
import { CurrentUserPayload } from '../auth/current-user.decorator';

const DEFAULT_DEED_CHECKLIST: DeedChecklistItem[] = [
  { key: 'identity', label: 'Alıcı & Satıcı Kimlik / Vergi Kimlik Kontrolü', completed: false },
  { key: 'title_deed', label: 'Tapu Kaydı & Takyidat (Haciz/Ipotek) Kontrolü', completed: false },
  { key: 'municipality', label: 'Belediye Rayiç Değeri & Borçsuzluk Belgesi', completed: false },
  { key: 'power_of_attorney', label: 'Vekâletname / Temsil Yetkisi Kontrolü', completed: false },
  { key: 'dask', label: 'Zorunlu Deprem Sigortası (DASK) Kontrolü', completed: false },
  { key: 'financials', label: 'Ödeme, Kredi & Bloke Transfer Süreçleri', completed: false },
  { key: 'deed_appointment', label: 'Web-Tapu Başvurusu & Randevu Onayı', completed: false },
];

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transaction) private readonly transactionRepo: Repository<Transaction>,
    @InjectRepository(TransactionNote) private readonly noteRepo: Repository<TransactionNote>,
    @InjectRepository(TransactionDocument) private readonly documentRepo: Repository<TransactionDocument>,
    @InjectRepository(Property) private readonly propertyRepo: Repository<Property>,
    @InjectRepository(Customer) private readonly customerRepo: Repository<Customer>,
  ) {}

  async create(dto: CreateTransactionDto, currentUser: CurrentUserPayload): Promise<Transaction> {
    if (!dto.customerId && !dto.externalCustomerLabel) {
      throw new BadRequestException('Müşteri seçin ya da harici müşteri bilgisi girin');
    }

    const transaction = this.transactionRepo.create({
      ...dto,
      agentId: currentUser.userId,
      stageChangedAt: new Date(),
      deedChecklist: dto.deedChecklist || DEFAULT_DEED_CHECKLIST,
    });

    if (dto.customerId && dto.propertyId) {
      const [customer, property] = await Promise.all([
        this.customerRepo.findOne({ where: { id: dto.customerId } }),
        this.propertyRepo.findOne({ where: { id: dto.propertyId } }),
      ]);
      if (customer?.agentId && property?.agentId && customer.agentId !== property.agentId) {
        const collaborator =
          currentUser.userId === customer.agentId
            ? property.agentId
            : currentUser.userId === property.agentId
              ? customer.agentId
              : property.agentId;
        if (collaborator !== currentUser.userId) {
          transaction.collaboratorAgentId = collaborator;
          transaction.commissionSplitPercentage = 50;
          transaction.splitApprovedByOwner = false;
          transaction.splitApprovedByCollaborator = false;
        }
      }
    }

    return this.transactionRepo.save(transaction);
  }

  async findAll(currentUser: CurrentUserPayload): Promise<Transaction[]> {
    const where =
      currentUser.role === 'agent'
        ? [{ agentId: currentUser.userId }, { collaboratorAgentId: currentUser.userId }]
        : {};
    return this.transactionRepo.find({ where, order: { updatedAt: 'DESC' } });
  }

  private async findOneOwned(id: string, currentUser: CurrentUserPayload): Promise<Transaction> {
    const transaction = await this.transactionRepo.findOne({ where: { id } });
    if (!transaction) {
      throw new NotFoundException('İşlem bulunamadı');
    }
    const isParticipant =
      transaction.agentId === currentUser.userId || transaction.collaboratorAgentId === currentUser.userId;
    if (currentUser.role === 'agent' && !isParticipant) {
      throw new ForbiddenException('Bu işleme erişim yetkiniz yok');
    }
    return transaction;
  }

  async updateSplit(
    id: string,
    dto: UpdateSplitDto,
    currentUser: CurrentUserPayload,
  ): Promise<Transaction> {
    const transaction = await this.findOneOwned(id, currentUser);
    if (!transaction.collaboratorAgentId) {
      throw new BadRequestException('Bu işlem işbirlikli satış değil');
    }
    transaction.commissionSplitPercentage = dto.commissionSplitPercentage;
    transaction.splitApprovedByOwner = false;
    transaction.splitApprovedByCollaborator = false;
    transaction.splitFinalizedAt = null;
    return this.transactionRepo.save(transaction);
  }

  async approveSplit(id: string, currentUser: CurrentUserPayload): Promise<Transaction> {
    const transaction = await this.findOneOwned(id, currentUser);
    if (!transaction.collaboratorAgentId) {
      throw new BadRequestException('Bu işlem işbirlikli satış değil');
    }
    if (currentUser.userId === transaction.agentId) {
      transaction.splitApprovedByOwner = true;
    } else if (currentUser.userId === transaction.collaboratorAgentId) {
      transaction.splitApprovedByCollaborator = true;
    } else if (currentUser.role !== 'broker') {
      throw new ForbiddenException('Bu paylaşımı onaylama yetkiniz yok');
    }
    if (transaction.splitApprovedByOwner && transaction.splitApprovedByCollaborator) {
      transaction.splitFinalizedAt = new Date();
    }
    return this.transactionRepo.save(transaction);
  }

  async update(
    id: string,
    dto: UpdateTransactionDto,
    currentUser: CurrentUserPayload,
  ): Promise<Transaction> {
    const transaction = await this.findOneOwned(id, currentUser);

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
    await this.documentRepo.delete({ transactionId: id });
    await this.transactionRepo.remove(transaction);
  }

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

  async getDocuments(
    transactionId: string,
    currentUser: CurrentUserPayload,
  ): Promise<TransactionDocument[]> {
    await this.findOneOwned(transactionId, currentUser);
    return this.documentRepo.find({ where: { transactionId }, order: { createdAt: 'DESC' } });
  }

  async addDocument(
    transactionId: string,
    dto: AddDocumentDto,
    currentUser: CurrentUserPayload,
  ): Promise<TransactionDocument> {
    await this.findOneOwned(transactionId, currentUser);
    const completed = dto.fileUrl ? true : !!dto.completed;
    const document = this.documentRepo.create({
      transactionId,
      docType: dto.docType,
      label: dto.label || null,
      completed,
      fileUrl: dto.fileUrl || null,
      fileName: dto.fileName || null,
      updatedByName: currentUser.name,
    });
    return this.documentRepo.save(document);
  }

  async removeDocument(documentId: string, currentUser: CurrentUserPayload): Promise<void> {
    const document = await this.documentRepo.findOne({ where: { id: documentId } });
    if (!document) {
      throw new NotFoundException('Belge bulunamadı');
    }
    await this.findOneOwned(document.transactionId, currentUser);
    await this.documentRepo.remove(document);
  }
}
