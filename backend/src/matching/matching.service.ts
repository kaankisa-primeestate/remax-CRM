import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Property, ListingType } from '../portfolios/property.entity';
import { Customer, CustomerType } from '../customers/customer.entity';
import { User } from '../users/user.entity';
import { CustomersService } from '../customers/customers.service';
import { PortfoliosService } from '../portfolios/portfolios.service';
import { CurrentUserPayload } from '../auth/current-user.decorator';

// ============================================================================
// SICAK FIRSATLAR ESLESTIRME MOTORU -- 2. NESIL (tamamen yeniden tasarlandi)
//
// ONCEKI TASARIMIN SORUNU: sadece musterinin serbest metin (Notlar/
// Gereksinimler) alanindan cikan kelimeleri, mulkun metniyle TAM ESITLIK
// (substring) ile karsilastiriyordu. Turkce'nin zengin ek yapisi yuzunden
// ("manzarali" ile "manzarasi" gibi) DOGRU yazilmis ama farkli EKLI ayni
// kelimeler dahi eslesmiyordu. Ayrica musterinin butce/ilce/oda-sayisi gibi
// YAPISAL alanlari eslestirmeye HIC KATILMIYORDU, sadece "profil doluluk"
// yuzdesi icin kullaniliyordu.
//
// YENI TASARIM (kullanicinin talimati): "kriter ile kriter degil, TUM
// bilgiler arasinda ortusme aranacak". Yani yapisal alanlar (ilce, oda
// sayisi, deniz manzarasi istegi vb.) da SERBEST METIN gibi birer "kelime"
// haline getirilip, HEM musterinin HEM mulkun TUM bilgisi birer metin
// havuzuna donusturuluyor, ve bu IKI HAVUZ, Turkce ek/kok farkina
// TOLERANSLI tek bir kelime eslestirme mekanizmasiyla karsilastiriliyor.
// Yuzde = ortusen kelime sayisi / musterinin toplam kelime sayisi.
//
// Butce/fiyat SAYISAL bir deger oldugu icin kelime eslestirmesine DAHIL
// EDILMEZ, ayri bir "uygunluk" (affordability) on-filtresi olarak kalir.
// ============================================================================

const STOPWORDS = new Set([
  've', 'veya', 'ile', 'bir', 'bu', 'su', 'sunu', 'cok', 'daha', 'gibi', 'olan', 'olsun',
  'istiyorum', 'istemiyor', 'istemiyorum', 'istiyoruz', 'yok', 'var', 'de', 'da', 'mi', 'mu',
  'ama', 'fakat', 'ancak', 'icin', 'kadar', 'gore', 'olmali', 'lazim', 'tercih', 'tercihen',
  'ediyorum', 'bize', 'bana', 'sizin', 'benim', 'onun', 'her', 'herhangi', 'm2', 'tl', 'k',
  'bin', 'milyon', 'adet', 'tane', 'not', 'notlar',
]);

const MIN_SCORE = 40; // yuzde 40 ve uzeri sonuclar gosterilir

function normalize(text: string): string {
  return (text || '')
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9\s]/gi, ' ');
}

function extractKeywords(text: string): string[] {
  const cleaned = normalize(text);
  const words = cleaned.split(/\s+/).filter(Boolean);
  const unique = Array.from(new Set(words));
  return unique.filter((w) => w.length >= 3 && !STOPWORDS.has(w));
}

// Turkce ek/kok toleransli kelime karsilastirmasi -- "manzarali" ile
// "manzarasi", "asansorlu" ile "asansor" gibi AYNI KOKTEN gelen ama
// farkli ekli kelimeleri de eslestirir. Kisa kelimelerde (4 harften az)
// TAM esitlik aranir, cunku kisa oneklerde yanlis-pozitif riski yuksektir
// (orn. "ev" ile "evet").
function wordsMatch(a: string, b: string): boolean {
  if (a === b) return true;
  if (a.length < 4 || b.length < 4) return false;
  const prefixLen = Math.min(5, Math.min(a.length, b.length) - 1);
  if (prefixLen < 5) return false;
  return a.slice(0, prefixLen) === b.slice(0, prefixLen);
}

function anyMatch(keyword: string, targetKeywords: string[]): boolean {
  return targetKeywords.some((t) => wordsMatch(keyword, t));
}

// Musterinin TUM bilgisini (yapisal alanlar DAHIL) tek bir metin havuzuna
// donusturur. Butce buraya DAHIL EDILMEZ (sayisal deger, ayri filtrelenir).
function buildCustomerSearchText(customer: Customer): string {
  const districts = customer.preferredDistricts?.join(' ') || customer.preferredDistrict || '';
  const rooms = customer.preferredRooms?.join(' ') || '';
  const extras = [
    customer.wantsSeaView && 'deniz manzara manzarali',
    customer.wantsNearMetro && 'metro yakin ulasim',
  ]
    .filter(Boolean)
    .join(' ');
  const raw = [
    customer.requirements,
    customer.notes,
    districts,
    rooms,
    customer.propertyInterest,
    extras,
  ]
    .filter(Boolean)
    .join(' ');
  return raw;
}

// Mulkun TUM bilgisini (yapisal alanlar DAHIL) tek bir metin havuzuna
// donusturur. Fiyat buraya DAHIL EDILMEZ (sayisal deger, ayri filtrelenir).
function buildPropertySearchText(property: Property): string {
  const extras = [
    property.hasPool && 'havuz',
    property.hasGym && 'spor salonu',
    property.hasSecurity && 'guvenlik',
    property.hasParking && 'otopark',
    property.nearMetro && 'metro yakin ulasim',
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
  return raw;
}

interface MatchResult {
  score: number;
  matchedCount: number;
  totalCount: number;
  matchedKeywords: string[];
}

// TUM bilgiler (yapisal + serbest metin) TEK bir kelime havuzunda
// karsilastirilir -- "kriter ile kriter degil, tum bilgiler arasinda
// ortusme" mantigi. Yuzde = ortusen kelime sayisi / musterinin toplam
// kelime sayisi.
function scoreMatch(customer: Customer, property: Property): MatchResult {
  const customerKeywords = extractKeywords(buildCustomerSearchText(customer));
  if (customerKeywords.length === 0) {
    return { score: 0, matchedCount: 0, totalCount: 0, matchedKeywords: [] };
  }
  const propertyKeywords = extractKeywords(buildPropertySearchText(property));
  const matched = customerKeywords.filter((k) => anyMatch(k, propertyKeywords));
  const score = Math.round((matched.length / customerKeywords.length) * 100);
  return { score, matchedCount: matched.length, totalCount: customerKeywords.length, matchedKeywords: matched };
}

// --- Bilgi Tamlığı / Eşleşme Güveni ---
function customerCompleteness(customer: Customer): number {
  const checklist = [
    !!customer.budget,
    !!customer.propertyInterest,
    !!(customer.preferredDistricts && customer.preferredDistricts.length),
    !!customer.purchaseTimeline,
    !!customer.email,
    !!customer.address,
    !!customer.requirements,
    !!customer.leadSource,
  ];
  const filled = checklist.filter(Boolean).length;
  return Math.round((filled / checklist.length) * 100);
}

function propertyCompleteness(property: Property): number {
  const checklist = [
    !!property.rooms,
    !!property.heatingType,
    !!property.view,
    !!property.facade,
    !!property.notes,
    !!(property.photoUrls && property.photoUrls.length),
    !!property.neighborhood,
    property.buildingAge != null,
  ];
  const filled = checklist.filter(Boolean).length;
  return Math.round((filled / checklist.length) * 100);
}

type ConfidenceLevel = 'high' | 'medium' | 'low';

interface ConfidenceResult {
  customerCompleteness: number;
  propertyCompleteness: number;
  confidenceScore: number;
  confidenceLevel: ConfidenceLevel;
}

function computeConfidence(customer: Customer, property: Property, matchedCount: number): ConfidenceResult {
  const custPct = customerCompleteness(customer);
  const propPct = propertyCompleteness(property);
  const matchStrengthFactor = Math.min(1, matchedCount / 3);
  const confidenceScore = Math.round(((custPct + propPct) / 2) * matchStrengthFactor);
  const confidenceLevel: ConfidenceLevel = confidenceScore >= 70 ? 'high' : confidenceScore >= 40 ? 'medium' : 'low';
  return { customerCompleteness: custPct, propertyCompleteness: propPct, confidenceScore, confidenceLevel };
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

  private async agentNameMap(): Promise<Map<string, string>> {
    const agents = await this.userRepo.find();
    return new Map(agents.map((a) => [a.id, a.name]));
  }

  private nameFor(agentId: string | null, agentNameById: Map<string, string>): string | undefined {
    if (!agentId) return undefined;
    return agentNameById.get(agentId) || 'Bilinmeyen';
  }

  // KRITIK DEGISIKLIK: agentId filtresi KALDIRILDI -- musterinin bagli
  // oldugu danisman ile mulkun bagli oldugu danisman FARKLI OLABILIR,
  // eslestirme TUM OFIS capinda (mahremiyetsiz) yapilir.
  async findMatchingPropertiesForCustomer(customerId: string, currentUser: CurrentUserPayload) {
    const customer = await this.customersService.findOne(customerId, currentUser);

    const isBuyerSide = customer.type === CustomerType.BUYER || customer.type === CustomerType.INVESTOR;
    if (!isBuyerSide && customer.type !== CustomerType.TENANT) {
      return [];
    }
    const listingType = isBuyerSide ? ListingType.SALE : ListingType.RENT;

    const properties = await this.propertyRepo.find({ where: { listingType } });
    const agentNameById = await this.agentNameMap();

    return properties
      .filter((property) => isAffordable(customer, property))
      .map((property) => {
        const match = scoreMatch(customer, property);
        const confidence = computeConfidence(customer, property, match.matchedCount);
        return {
          property,
          ...match,
          ...confidence,
          agentName: this.nameFor(property.agentId, agentNameById),
        };
      })
      .filter((r) => r.matchedCount >= 1 && r.score >= MIN_SCORE)
      .sort((a, b) => b.score - a.score);
  }

  async findMatchingCustomersForProperty(propertyId: string, currentUser: CurrentUserPayload) {
    const property = await this.portfoliosService.findOne(propertyId, currentUser);

    const wantedTypes =
      property.listingType === ListingType.SALE
        ? [CustomerType.BUYER, CustomerType.INVESTOR]
        : [CustomerType.TENANT];

    const customers = await this.customerRepo.find({ where: { type: wantedTypes as any } });
    const agentNameById = await this.agentNameMap();

    return customers
      .filter((customer) => isAffordable(customer, property))
      .map((customer) => {
        const match = scoreMatch(customer, property);
        const confidence = computeConfidence(customer, property, match.matchedCount);
        return {
          customer,
          ...match,
          ...confidence,
          agentName: this.nameFor(customer.agentId, agentNameById),
        };
      })
      .filter((r) => r.matchedCount >= 1 && r.score >= MIN_SCORE)
      .sort((a, b) => b.score - a.score);
  }

  // YENI: Ofis genelinde TUM eslesmeleri tarar -- "Sicak Firsatlar"
  // sayfasinin Broker gorunumu (tum ofis) ve Danisman gorunumu (kendi
  // musterisi/portfoyu ile ilgili olanlar) icin ORTAK kaynak.
  async findAllHotMatches(currentUser: CurrentUserPayload) {
    const [buyerTenantCustomers, agentNameById] = await Promise.all([
      this.customerRepo.find({
        where: [{ type: CustomerType.BUYER }, { type: CustomerType.INVESTOR }, { type: CustomerType.TENANT }],
      }),
      this.agentNameMap(),
    ]);
    const properties = await this.propertyRepo.find();
    const propertiesByListingType = {
      [ListingType.SALE]: properties.filter((p) => p.listingType === ListingType.SALE),
      [ListingType.RENT]: properties.filter((p) => p.listingType === ListingType.RENT),
    };

    const results: any[] = [];
    for (const customer of buyerTenantCustomers) {
      const isBuyerSide = customer.type === CustomerType.BUYER || customer.type === CustomerType.INVESTOR;
      const candidateProperties = propertiesByListingType[isBuyerSide ? ListingType.SALE : ListingType.RENT];
      for (const property of candidateProperties) {
        if (!isAffordable(customer, property)) continue;
        const match = scoreMatch(customer, property);
        if (match.matchedCount < 1 || match.score < MIN_SCORE) continue;
        const confidence = computeConfidence(customer, property, match.matchedCount);
        results.push({
          customer,
          property,
          ...match,
          ...confidence,
          customerAgentName: this.nameFor(customer.agentId, agentNameById),
          propertyAgentName: this.nameFor(property.agentId, agentNameById),
        });
      }
    }

    results.sort((a, b) => b.score - a.score);

    if (currentUser.role === 'agent') {
      return results.filter(
        (r) => r.customer.agentId === currentUser.userId || r.property.agentId === currentUser.userId,
      );
    }
    return results;
  }
}
