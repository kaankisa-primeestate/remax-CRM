import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Property, ListingType } from '../portfolios/property.entity';
import { Customer, CustomerType } from '../customers/customer.entity';
import { User } from '../users/user.entity';
import { CustomersService } from '../customers/customers.service';
import { PortfoliosService } from '../portfolios/portfolios.service';
import { CurrentUserPayload } from '../auth/current-user.decorator';

const MIN_SCORE = 25; // en az butce ya da lokasyon eslesmesi olmali

function scoreProperty(customer: Customer, property: Property): number {
  let score = 0;

  if (customer.preferredDistrict && property.district) {
    if (property.district.toLowerCase().includes(customer.preferredDistrict.toLowerCase())) {
      score += 30;
    }
  }

  if (customer.budget != null && property.price != null) {
    const budget = Number(customer.budget);
    const price = Number(property.price);
    if (price <= budget) {
      score += 25;
    } else if (price <= budget * 1.1) {
      score += 10;
    }
  }

  if (customer.preferredRooms && customer.preferredRooms.length > 0 && property.rooms) {
    if (customer.preferredRooms.includes(property.rooms)) {
      score += 20;
    }
  }

  if (customer.wantsSeaView === true && property.view) {
    if (property.view.toLowerCase().includes('deniz')) {
      score += 15;
    }
  }

  if (customer.wantsNearMetro === true && property.nearMetro) {
    score += 10;
  }

  return score;
}

@Injectable()
export class MatchingService {
  constructor(
    @InjectRepository(Property) private readonly propertyRepo: Repository<Property>,
    @InjectRepository(Customer) private readonly customerRepo: Repository<Customer>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly customersService: CustomersService,
    private readonly portfoliosService: PortfoliosService,
  ) {}

  private async agentNameMap(currentUser: CurrentUserPayload): Promise<Map<string, string>> {
    if (currentUser.role !== 'broker') {
      return new Map();
    }
    const agents = await this.userRepo.find();
    return new Map(agents.map((a) => [a.id, a.name]));
  }

  private nameFor(agentId: string | null, agentNameById: Map<string, string>): string | undefined {
    if (!agentId) return undefined;
    return agentNameById.get(agentId) || 'Bilinmeyen';
  }

  async findMatchingPropertiesForCustomer(customerId: string, currentUser: CurrentUserPayload) {
    const customer = await this.customersService.findOne(customerId, currentUser);

    // Sadece arayis icinde olan musteri tipleri icin anlamli
    if (customer.type !== CustomerType.BUYER && customer.type !== CustomerType.TENANT) {
      return [];
    }
    const listingType = customer.type === CustomerType.BUYER ? ListingType.SALE : ListingType.RENT;

    const qb = this.propertyRepo
      .createQueryBuilder('property')
      .where('property.listingType = :listingType', { listingType });
    if (currentUser.role === 'agent') {
      qb.andWhere('property.agentId = :agentId', { agentId: currentUser.userId });
    }
    const properties = await qb.getMany();
    const agentNameById = await this.agentNameMap(currentUser);

    return properties
      .map((property) => ({
        property,
        score: scoreProperty(customer, property),
        agentName: currentUser.role === 'broker' ? this.nameFor(property.agentId, agentNameById) : undefined,
      }))
      .filter((r) => r.score >= MIN_SCORE)
      .sort((a, b) => b.score - a.score);
  }

  async findMatchingCustomersForProperty(propertyId: string, currentUser: CurrentUserPayload) {
    const property = await this.portfoliosService.findOne(propertyId, currentUser);

    const wantedType =
      property.listingType === ListingType.SALE ? CustomerType.BUYER : CustomerType.TENANT;

    const qb = this.customerRepo
      .createQueryBuilder('customer')
      .where('customer.type = :type', { type: wantedType });
    if (currentUser.role === 'agent') {
      qb.andWhere('customer.agentId = :agentId', { agentId: currentUser.userId });
    }
    const customers = await qb.getMany();
    const agentNameById = await this.agentNameMap(currentUser);

    return customers
      .map((customer) => ({
        customer,
        score: scoreProperty(customer, property),
        agentName: currentUser.role === 'broker' ? this.nameFor(customer.agentId, agentNameById) : undefined,
      }))
      .filter((r) => r.score >= MIN_SCORE)
      .sort((a, b) => b.score - a.score);
  }
}
