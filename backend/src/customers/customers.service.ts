import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from './customer.entity';
import { Interaction } from './interaction.entity';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CreateInteractionDto } from './dto/create-interaction.dto';
import { CurrentUserPayload } from '../auth/current-user.decorator';

export interface FindCustomersQuery {
  search?: string; // ad, soyad veya telefonda arar
  type?: string; // buyer/seller/tenant/landlord
  agentId?: string; // sadece Broker için geçerli, isteğe bağlı filtre
}

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    @InjectRepository(Interaction)
    private readonly interactionRepo: Repository<Interaction>,
  ) {}

  async create(dto: CreateCustomerDto, currentUser: CurrentUserPayload): Promise<Customer> {
    const existing = await this.customerRepo.findOne({ where: { phone: dto.phone } });
    if (existing) {
      throw new ConflictException('Bu telefon numarasıyla kayıtlı bir müşteri zaten var');
    }

    // Mahremiyet Duvarı: bir Danışman ne gönderirse göndersin, oluşturduğu
    // müşteri otomatik olarak kendisine atanır — başka bir danışmanın
    // adına müşteri oluşturamaz. Broker isterse belirli bir danışmana
    // atayabilir (dto.agentId), belirtmezse "atanmamış" kalır.
    const agentId = currentUser.role === 'agent' ? currentUser.userId : dto.agentId ?? null;

    const customer = this.customerRepo.create({ ...dto, agentId });
    return this.customerRepo.save(customer);
  }

  async findAll(query: FindCustomersQuery, currentUser: CurrentUserPayload): Promise<Customer[]> {
    const qb = this.customerRepo
      .createQueryBuilder('customer')
      .orderBy('customer.createdAt', 'DESC');

    if (query.search) {
      qb.andWhere(
        '(customer.firstName ILIKE :search OR customer.lastName ILIKE :search OR customer.phone ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }
    if (query.type) {
      qb.andWhere('customer.type = :type', { type: query.type });
    }

    // Mahremiyet Duvarı: bir Danışman sadece kendi müşterilerini görebilir.
    // İstemci farklı bir agentId göndermeye çalışsa bile bu YOK SAYILIR.
    if (currentUser.role === 'agent') {
      qb.andWhere('customer.agentId = :agentId', { agentId: currentUser.userId });
    } else if (query.agentId) {
      // Broker isteğe bağlı olarak belirli bir danışmanın müşterilerini filtreleyebilir
      qb.andWhere('customer.agentId = :agentId', { agentId: query.agentId });
    }

    return qb.getMany();
  }

  async findOne(id: string, currentUser: CurrentUserPayload): Promise<Customer> {
    const customer = await this.customerRepo.findOne({
      where: { id },
      relations: { interactions: true },
      order: { interactions: { occurredAt: 'DESC' } },
    });
    if (!customer) {
      throw new NotFoundException('Müşteri bulunamadı');
    }
    this.assertAccess(customer, currentUser);
    return customer;
  }

  async update(
    id: string,
    dto: UpdateCustomerDto,
    currentUser: CurrentUserPayload,
  ): Promise<Customer> {
    const customer = await this.findOne(id, currentUser);
    // Bir Danışman, kendi müşterisini başka bir danışmana devredemez
    const safeDto = currentUser.role === 'agent' ? { ...dto, agentId: undefined } : dto;
    Object.assign(customer, safeDto);
    return this.customerRepo.save(customer);
  }

  async remove(id: string, currentUser: CurrentUserPayload): Promise<void> {
    const customer = await this.findOne(id, currentUser);
    await this.customerRepo.remove(customer);
  }

  async addInteraction(
    customerId: string,
    dto: CreateInteractionDto,
    currentUser: CurrentUserPayload,
  ): Promise<Interaction> {
    // findOne zaten erişim kontrolünü (Mahremiyet Duvarı) uyguluyor
    await this.findOne(customerId, currentUser);
    const interaction = this.interactionRepo.create({
      ...dto,
      customerId,
      occurredAt: new Date(dto.occurredAt),
    });
    return this.interactionRepo.save(interaction);
  }

  // Bir Danışman'ın, kendisine ait olmayan bir müşteri kaydına erişmeye
  // çalışması durumunda 403 Forbidden döner.
  private assertAccess(customer: Customer, currentUser: CurrentUserPayload) {
    if (currentUser.role === 'agent' && customer.agentId !== currentUser.userId) {
      throw new ForbiddenException('Bu müşteri kaydına erişim yetkiniz yok');
    }
  }
}
