import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Customer } from './customer.entity';
import { Interaction } from './interaction.entity';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CreateInteractionDto } from './dto/create-interaction.dto';

export interface FindCustomersQuery {
  search?: string; // ad, soyad veya telefonda arar
  type?: string; // buyer/seller/tenant/landlord
  agentId?: string; // Mahremiyet Duvarı: belirli bir danışmana ait kayıtlar
}

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    @InjectRepository(Interaction)
    private readonly interactionRepo: Repository<Interaction>,
  ) {}

  async create(dto: CreateCustomerDto): Promise<Customer> {
    const existing = await this.customerRepo.findOne({ where: { phone: dto.phone } });
    if (existing) {
      throw new ConflictException('Bu telefon numarasıyla kayıtlı bir müşteri zaten var');
    }
    const customer = this.customerRepo.create(dto);
    return this.customerRepo.save(customer);
  }

  async findAll(query: FindCustomersQuery): Promise<Customer[]> {
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
    if (query.agentId) {
      qb.andWhere('customer.agentId = :agentId', { agentId: query.agentId });
    }

    return qb.getMany();
  }

  async findOne(id: string): Promise<Customer> {
    const customer = await this.customerRepo.findOne({
      where: { id },
      relations: { interactions: true },
      order: { interactions: { occurredAt: 'DESC' } },
    });
    if (!customer) {
      throw new NotFoundException('Müşteri bulunamadı');
    }
    return customer;
  }

  async update(id: string, dto: UpdateCustomerDto): Promise<Customer> {
    const customer = await this.findOne(id);
    Object.assign(customer, dto);
    return this.customerRepo.save(customer);
  }

  async remove(id: string): Promise<void> {
    const customer = await this.findOne(id);
    await this.customerRepo.remove(customer);
  }

  async addInteraction(customerId: string, dto: CreateInteractionDto): Promise<Interaction> {
    // Müşteri gerçekten var mı diye kontrol eder (yoksa 404 fırlatır)
    await this.findOne(customerId);
    const interaction = this.interactionRepo.create({
      ...dto,
      customerId,
      occurredAt: new Date(dto.occurredAt),
    });
    return this.interactionRepo.save(interaction);
  }
}
