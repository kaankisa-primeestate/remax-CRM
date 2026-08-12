import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Property, ListingType } from '../portfolios/property.entity';
import { Customer, CustomerType } from '../customers/customer.entity';
import { User } from '../users/user.entity';
import { CustomersService } from '../customers/customers.service';
import { PortfoliosService } from '../portfolios/portfolios.service';
import { CurrentUserPayload } from '../auth/current-user.decorator';

// Anlamsiz/cok genel kelimeleri elemek icin -- eslestirme kalitesini artirir
const STOPWORDS = new Set([
  've', 'veya', 'ile', 'bir', 'bu', 'su', 'sunu', 'cok', 'daha', 'gibi', 'olan', 'olsun',
  'istiyorum', 'istemiyor', 'istemiyorum', 'istiyoruz', 'yok', 'var', 'de', 'da', 'mi', 'mu',
  'ama', 'fakat', 'ancak', 'icin', 'kadar', 'gore', 'olmali', 'lazim', 'tercih', 'tercihen',
  'ediyorum', 'bize', 'bana', 'sizin', 'benim', 'onun', 'her', 'herhangi', 'm2', 'tl', 'k',
  'bin', 'milyon', 'adet', 'tane', 'not', 'notlar',
]);

const MIN_SCORE = 40; // yuzde 40 ve uzeri kelime eslesmesi olan sonuclar gosterilir

function normalize(text: string): string {
  return (text || '')
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .replace(/[^a-z0-9\s]/gi, ' ');
}

function extractKeywords(text: string): string[] {
  const cleaned = normalize(text);
  const words = cleaned.split(/\s+/).filter(Boolean);
  const unique = Array.from(new Set(words));
  return unique.filter((w) => w.length >= 3 && !STOPWORDS.has(w));
}

function buildPropertySearchText(property: Property): string {
  const extras = [
    property.hasPool && 'havuz',
    property.hasGym && 'spor salonu',
    property.hasSecurity && 'guvenlik',
    property.hasParking && 'otopark',
    property.nearMetro && 'metro',
  ]
    .filter(Boolean)
    .join(' ');
  const raw = [
    property.title,
    property.district,
    property.neighborhood,
    property.rooms,
    property.view,
    property.facade,
    property.heatingType,
    property.deedStatus,
    property.notes,
    extras,
  ]
    .filter(Boolean)
    .join(' ');
  return normalize(raw);
}

interface MatchResult {
  score: number;
  matchedCount: number;
  totalCount: number;
  matchedKeywords: string[];
}

function scoreMatch(customer: Customer, property: Property): MatchResult {
  const customerText = [customer.requirements, customer.notes].filter(Boolean).join(' ');
  const keywords = extractKeywords(customerText);
  if (keywords.length === 0) {
    return { score: 0, matchedCount: 0, totalCount: 0, matchedKeywords: [] };
  }
  const propertyText = buildPropertySearchText(property);
  const matched = keywords.filter((k) => propertyText.includes(k));
  const score = Math.round((matched.length / keywords.length) * 100);
  return { score, matchedCount: matched.length, totalCount: keywords.length, matchedKeywords: matched };
}

function isAffordable(customer: Customer, property: Property): boolean {
  if (customer.budget == null || property.price == null) return true;
  return Number(property.price) <= Number(customer.budget) * 1.5;
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
      .filter((property) => isAffordable(customer, property))
      .map((property) => {
        const match = scoreMatch(customer, property);
        return {
          property,
          ...match,
          agentName: currentUser.role === 'broker' ? this.nameFor(property.agentId, agentNameById) : undefined,
        };
      })
      .filter((r) => r.matchedCount >= 1 && r.score >= MIN_SCORE)
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
      .filter((customer) => isAffordable(customer, property))
      .map((customer) => {
        const match = scoreMatch(customer, property);
        return {
          customer,
          ...match,
          agentName: currentUser.role === 'broker' ? this.nameFor(customer.agentId, agentNameById) : undefined,
        };
      })
      .filter((r) => r.matchedCount >= 1 && r.score >= MIN_SCORE)
      .sort((a, b) => b.score - a.score);
  }
}
