import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Transaction, TransactionStage, OfferStatus, DeedChecklistItem } from './transaction.entity';
import { TransactionNote } from './transaction-note.entity';
import { TransactionDocument, TransactionDocType } from './transaction-document.entity';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { AddNoteDto } from './dto/add-note.dto';
import { AddDocumentDto } from './dto/add-document.dto';
import { UpdateSplitDto } from './dto/update-split.dto';
import { Property, PropertyStatus } from '../portfolios/property.entity';
import { Customer } from '../customers/customer.entity';
import { Commission, CommissionStatus } from '../commissions/commission.entity';
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

const STAGE_LABELS: Record<string, string> = {
  lead: 'Talep',
  showing: 'Gösterme',
  offer: 'Teklif',
  deed: 'Tapu',
  closed: 'Kapanış',
};

const DOC_TYPE_LABELS: Record<string, string> = {
  disclosure: 'Yer Gösterme Formu',
  offer: 'Teklif Belgesi',
  contract: 'Sözleşme',
  deed: 'Tapu',
  id: 'Kimlik',
  other: 'Diğer Belge',
};

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transaction) private readonly transactionRepo: Repository<Transaction>,
    @InjectRepository(TransactionNote) private readonly noteRepo: Repository<TransactionNote>,
    @InjectRepository(TransactionDocument) private readonly documentRepo: Repository<TransactionDocument>,
    @InjectRepository(Property) private readonly propertyRepo: Repository<Property>,
    @InjectRepository(Customer) private readonly customerRepo: Repository<Customer>,
    @InjectRepository(Commission) private readonly commissionRepo: Repository<Commission>,
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

  async findOne(id: string, currentUser: CurrentUserPayload): Promise<Transaction> {
    return this.findOneOwned(id, currentUser);
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
    const previousStage = transaction.stage; // Object.assign'dan ONCE, degisimi yakalamak icin
    const offerStatusChanging = dto.offerStatus !== undefined && dto.offerStatus !== transaction.offerStatus;
    const previousOfferStatus = transaction.offerStatus;

    Object.assign(transaction, dto);
    if (stageChanging) {
      transaction.stageChangedAt = new Date();
    }
    if (dealJustApproved) {
      transaction.dealApprovedAt = new Date();
    }
    const saved = await this.transactionRepo.save(transaction);

    // Piyasadaki profesyonel sistemlerin ortak deseni (Dotloop, SkySlope):
    // her ONEMLI durum degisimi, danismanin elle yazmasina gerek kalmadan
    // otomatik olarak Zaman Akisi'na (Aktivite Akisi) dusmeli. Boylece
    // islem, basindan sonuna kadar KENDILIGINDEN olusan bir "dosya
    // hikayesine" doner.
    if (stageChanging) {
      await this.noteRepo.save(
        this.noteRepo.create({
          transactionId: saved.id,
          text: `🔄 Aşama değişti: ${STAGE_LABELS[previousStage as string] || previousStage} → ${STAGE_LABELS[dto.stage as string] || dto.stage}`,
          authorId: currentUser.userId,
          authorName: currentUser.name,
        }),
      );
    }
    if (offerStatusChanging) {
      const OFFER_STATUS_LABELS: Record<string, string> = {
        pending: 'Beklemede',
        accepted: 'Kabul Edildi',
        rejected: 'Reddedildi',
        withdrawn: 'Geri Çekildi',
      };
      await this.noteRepo.save(
        this.noteRepo.create({
          transactionId: saved.id,
          text: `🏷️ Teklif durumu güncellendi: ${OFFER_STATUS_LABELS[previousOfferStatus as string] || previousOfferStatus || 'Belirtilmemiş'} → ${OFFER_STATUS_LABELS[dto.offerStatus as string] || dto.offerStatus}`,
          authorId: currentUser.userId,
          authorName: currentUser.name,
        }),
      );
    }
    if (dealJustApproved) {
      // KRITIK DUZELTME: Bu satirdan once, Broker'in "Onayla" demesi
      // SADECE Transaction.dealApproved bayragini isaretliyordu -- ilgili
      // Commission kaydi(lari)nin durumunu HIC guncellemiyordu. Sonuc:
      // danisman cari ekstresi (sadece 'approved'/'paid' durumundaki
      // komisyonlari sayar) bu hakedisi ASLA gormuyordu, ta ki Broker
      // AYRICA, bagimsiz olarak Komisyonlar sayfasindan da elle "Onayla"
      // demeyi hatirlayana kadar -- iki kopuk onay adimi, unutulmaya
      // acik bir tasarim hatasiydi (mentorluk dokumaniyla karsilastirma
      // sirasinda tespit edildi). Artik TEK onay adimi yeterli: Broker
      // Transaction'i onaylar onaylamaz, o islemle iliskili TUM
      // 'pending' komisyonlar (isbirlikli satista birden fazla olabilir)
      // otomatik olarak 'approved' durumuna geciyor.
      const relatedCommissions = await this.commissionRepo.find({
        where: { transactionId: saved.id, status: CommissionStatus.PENDING },
      });
      for (const commission of relatedCommissions) {
        commission.status = CommissionStatus.APPROVED;
        commission.statusChangedAt = new Date();
      }
      if (relatedCommissions.length > 0) {
        await this.commissionRepo.save(relatedCommissions);
      }

      await this.noteRepo.save(
        this.noteRepo.create({
          transactionId: saved.id,
          text:
            relatedCommissions.length > 0
              ? `✅ İşlem Broker (${currentUser.name}) tarafından onaylandı — ${relatedCommissions.length} komisyon kaydı hakedişe dönüştü.`
              : `✅ İşlem Broker (${currentUser.name}) tarafından onaylandı — komisyon süreci başladı.`,
          authorId: currentUser.userId,
          authorName: currentUser.name,
        }),
      );
    }

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
      isBrokerFlag: !!dto.isBrokerFlag,
    });
    return this.noteRepo.save(note);
  }

  // Broker "Cozuldu" dedi -- bayrak Aksiyon Merkezi'nden kaybolur, kayit
  // Aktivite Akisi'nda kalmaya devam eder (silinmez).
  async resolveNoteFlag(noteId: string, currentUser: CurrentUserPayload): Promise<TransactionNote> {
    if (currentUser.role !== 'broker') {
      throw new ForbiddenException('Sadece Broker çözüldü olarak işaretleyebilir');
    }
    const note = await this.noteRepo.findOne({ where: { id: noteId } });
    if (!note) {
      throw new NotFoundException('Kayıt bulunamadı');
    }
    note.resolved = true;
    return this.noteRepo.save(note);
  }

  // Broker'in Aksiyon Merkezi'nde gosterilecek, henuz cozulmemis TUM
  // bayrakli bildirimler (hangi islemden geldigi bilgisiyle birlikte).
  async getUnresolvedBrokerFlags(): Promise<
    (TransactionNote & { propertyTitle: string | null; customerName: string | null })[]
  > {
    const flags = await this.noteRepo.find({
      where: { isBrokerFlag: true, resolved: false },
      order: { createdAt: 'DESC' },
    });
    if (flags.length === 0) return [];

    const txIds = [...new Set(flags.map((f) => f.transactionId))];
    const txs = await this.transactionRepo.find({ where: { id: In(txIds) } });
    const txById = new Map(txs.map((t) => [t.id, t]));
    const propertyIds = txs.map((t) => t.propertyId).filter(Boolean) as string[];
    const customerIds = txs.map((t) => t.customerId).filter(Boolean) as string[];
    const [properties, customers] = await Promise.all([
      propertyIds.length ? this.propertyRepo.find({ where: { id: In(propertyIds) } }) : Promise.resolve([]),
      customerIds.length ? this.customerRepo.find({ where: { id: In(customerIds) } }) : Promise.resolve([]),
    ]);
    const propertyTitleById = new Map(properties.map((p) => [p.id, p.title]));
    const customerNameById = new Map(customers.map((c) => [c.id, `${c.firstName} ${c.lastName}`]));

    return flags.map((f) => {
      const tx = txById.get(f.transactionId);
      return {
        ...f,
        propertyTitle: tx?.propertyId ? propertyTitleById.get(tx.propertyId) || tx.externalPropertyLabel || null : tx?.externalPropertyLabel || null,
        customerName: tx?.customerId ? customerNameById.get(tx.customerId) || tx.externalCustomerLabel || null : tx?.externalCustomerLabel || null,
      };
    });
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
    const saved = await this.documentRepo.save(document);

    // Piyasadaki profesyonel sistemlerin ortak deseni: her belge islemi
    // (yukleme/duzenleme/silme) otomatik olarak Zaman Akisi'na (audit
    // trail) dusmeli -- ayri bir "denetim log" tablosu kurmadan, zaten
    // var olan not sistemini kullaniyoruz.
    const typeLabel = DOC_TYPE_LABELS[dto.docType] || dto.docType;
    await this.noteRepo.save(
      this.noteRepo.create({
        transactionId,
        text: dto.fileUrl
          ? `📎 ${typeLabel} yüklendi${dto.label ? ` (${dto.label})` : ''}`
          : `✓ ${typeLabel} tamamlandı olarak işaretlendi`,
        authorId: currentUser.userId,
        authorName: currentUser.name,
      }),
    );

    return saved;
  }

  // Danisman kucuk/hassas alanlari (tarih, tutar, aciklama vb.) duzeltebilir
  // -- ama SILME yetkisi yok (asagida, sadece Broker). Her duzenleme de
  // otomatik not birakir, boylece "hangi alan ne zaman degisti" izlenebilir.
  async updateDocument(
    documentId: string,
    dto: AddDocumentDto,
    currentUser: CurrentUserPayload,
  ): Promise<TransactionDocument> {
    const document = await this.documentRepo.findOne({ where: { id: documentId } });
    if (!document) {
      throw new NotFoundException('Belge bulunamadı');
    }
    await this.findOneOwned(document.transactionId, currentUser);

    document.label = dto.label ?? document.label;
    if (dto.fileUrl !== undefined) document.fileUrl = dto.fileUrl;
    if (dto.fileName !== undefined) document.fileName = dto.fileName;
    if (dto.completed !== undefined) document.completed = dto.completed;
    document.updatedByName = currentUser.name;
    const saved = await this.documentRepo.save(document);

    const typeLabel = DOC_TYPE_LABELS[document.docType] || document.docType;
    await this.noteRepo.save(
      this.noteRepo.create({
        transactionId: document.transactionId,
        text: `✎ ${typeLabel} güncellendi`,
        authorId: currentUser.userId,
        authorName: currentUser.name,
      }),
    );

    return saved;
  }

  // SADECE Broker silebilir -- piyasadaki tum ciddi sistemlerde (Dotloop,
  // SkySlope, Paperless Pipeline) denetime tabi belgelerin silinmesi
  // yonetim/broker rolune kisitlidir, ajanlar sadece yukler/duzenler.
  async removeDocument(documentId: string, currentUser: CurrentUserPayload): Promise<void> {
    const document = await this.documentRepo.findOne({ where: { id: documentId } });
    if (!document) {
      throw new NotFoundException('Belge bulunamadı');
    }
    await this.findOneOwned(document.transactionId, currentUser);
    if (currentUser.role !== 'broker') {
      throw new ForbiddenException(
        'Belgeleri sadece Broker silebilir. Bir düzeltme gerekiyorsa lütfen Zaman Akışı üzerinden Broker\'a bildirin.',
      );
    }
    const typeLabel = DOC_TYPE_LABELS[document.docType] || document.docType;
    await this.documentRepo.remove(document);
    await this.noteRepo.save(
      this.noteRepo.create({
        transactionId: document.transactionId,
        text: `🗑 ${typeLabel} Broker tarafından silindi${document.label ? ` (${document.label})` : ''}`,
        authorId: currentUser.userId,
        authorName: currentUser.name,
      }),
    );
  }
}
