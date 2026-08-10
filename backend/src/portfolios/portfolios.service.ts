import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Property } from './property.entity';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { CurrentUserPayload } from '../auth/current-user.decorator';

export interface FindPropertiesQuery {
  search?: string; // başlık, il, ilçe, mahallede arar
  propertyType?: string;
  listingType?: string;
  status?: string;
  district?: string;
  minPrice?: string;
  maxPrice?: string;
  minArea?: string;
  maxArea?: string;
  agentId?: string; // sadece Broker için geçerli
  rooms?: string; // ornek: '2+1'
  minBuildingAge?: string;
  maxBuildingAge?: string;
  heatingType?: string;
  view?: string;
  hasPool?: string; // 'true' ise filtrele
  hasGym?: string;
  hasSecurity?: string;
  hasParking?: string;
  keyword?: string; // notlar, manzara, cephe, isitma, tapu durumunda serbest metin arar
}

@Injectable()
export class PortfoliosService {
  constructor(
    @InjectRepository(Property)
    private readonly propertyRepo: Repository<Property>,
  ) {}

  async create(dto: CreatePropertyDto, currentUser: CurrentUserPayload): Promise<Property> {
    // Mahremiyet Duvarı: bir Danışman oluşturduğu portföy otomatik olarak
    // kendisine atanır; Broker isterse belirli bir danışmana atayabilir.
    const agentId = currentUser.role === 'agent' ? currentUser.userId : dto.agentId ?? null;
    const property = this.propertyRepo.create({ ...dto, agentId });
    return this.propertyRepo.save(property);
  }

  async findAll(query: FindPropertiesQuery, currentUser: CurrentUserPayload): Promise<Property[]> {
    const qb = this.propertyRepo
      .createQueryBuilder('property')
      .orderBy('property.createdAt', 'DESC');

    if (query.search) {
      qb.andWhere(
        '(property.title ILIKE :search OR property.province ILIKE :search OR property.district ILIKE :search OR property.neighborhood ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }
    if (query.propertyType) {
      qb.andWhere('property.propertyType = :propertyType', { propertyType: query.propertyType });
    }
    if (query.listingType) {
      qb.andWhere('property.listingType = :listingType', { listingType: query.listingType });
    }
    if (query.status) {
      qb.andWhere('property.status = :status', { status: query.status });
    }
    if (query.district) {
      qb.andWhere('property.district ILIKE :district', { district: `%${query.district}%` });
    }
    if (query.minPrice) {
      qb.andWhere('property.price >= :minPrice', { minPrice: query.minPrice });
    }
    if (query.maxPrice) {
      qb.andWhere('property.price <= :maxPrice', { maxPrice: query.maxPrice });
    }
    if (query.minArea) {
      qb.andWhere('property.areaM2 >= :minArea', { minArea: query.minArea });
    }
    if (query.maxArea) {
      qb.andWhere('property.areaM2 <= :maxArea', { maxArea: query.maxArea });
    }
    if (query.rooms) {
      qb.andWhere('property.rooms = :rooms', { rooms: query.rooms });
    }
    if (query.minBuildingAge) {
      qb.andWhere('property.buildingAge >= :minBuildingAge', { minBuildingAge: query.minBuildingAge });
    }
    if (query.maxBuildingAge) {
      qb.andWhere('property.buildingAge <= :maxBuildingAge', { maxBuildingAge: query.maxBuildingAge });
    }
    if (query.heatingType) {
      qb.andWhere('property.heatingType ILIKE :heatingType', { heatingType: `%${query.heatingType}%` });
    }
    if (query.view) {
      qb.andWhere('property.view ILIKE :view', { view: `%${query.view}%` });
    }
    if (query.hasPool === 'true') {
      qb.andWhere('property.hasPool = true');
    }
    if (query.hasGym === 'true') {
      qb.andWhere('property.hasGym = true');
    }
    if (query.hasSecurity === 'true') {
      qb.andWhere('property.hasSecurity = true');
    }
    if (query.hasParking === 'true') {
      qb.andWhere('property.hasParking = true');
    }
    if (query.keyword) {
      qb.andWhere(
        '(property.notes ILIKE :keyword OR property.view ILIKE :keyword OR property.facade ILIKE :keyword OR property.heatingType ILIKE :keyword OR property.deedStatus ILIKE :keyword OR property.title ILIKE :keyword)',
        { keyword: `%${query.keyword}%` },
      );
    }

    // Mahremiyet Duvarı: bir Danışman sadece kendi portföyünü görebilir.
    if (currentUser.role === 'agent') {
      qb.andWhere('property.agentId = :agentId', { agentId: currentUser.userId });
    } else if (query.agentId) {
      qb.andWhere('property.agentId = :agentId', { agentId: query.agentId });
    }

    return qb.getMany();
  }

  async findOne(id: string, currentUser: CurrentUserPayload): Promise<Property> {
    const property = await this.propertyRepo.findOne({ where: { id } });
    if (!property) {
      throw new NotFoundException('Portföy bulunamadı');
    }
    this.assertAccess(property, currentUser);
    return property;
  }

  async update(
    id: string,
    dto: UpdatePropertyDto,
    currentUser: CurrentUserPayload,
  ): Promise<Property> {
    const property = await this.findOne(id, currentUser);
    const safeDto = currentUser.role === 'agent' ? { ...dto, agentId: undefined } : dto;
    Object.assign(property, safeDto);
    return this.propertyRepo.save(property);
  }

  async remove(id: string, currentUser: CurrentUserPayload): Promise<void> {
    const property = await this.findOne(id, currentUser);
    await this.propertyRepo.remove(property);
  }

  private assertAccess(property: Property, currentUser: CurrentUserPayload) {
    if (currentUser.role === 'agent' && property.agentId !== currentUser.userId) {
      throw new ForbiddenException('Bu portföye erişim yetkiniz yok');
    }
  }

  // Herkese acik paylasim sayfasi icin kullanilir (giris yapmadan erisilir).
  // DIKKAT: sadece guvenli/genel alanlar dondurulur. notes, tam adres,
  // agentId, musteri bilgisi gibi hassas alanlar KESINLIKLE dondurulmez.
  async findOnePublic(id: string) {
    const property = await this.propertyRepo.findOne({ where: { id } });
    if (!property) {
      throw new NotFoundException('İlan bulunamadı');
    }
    return {
      id: property.id,
      title: property.title,
      propertyType: property.propertyType,
      listingType: property.listingType,
      province: property.province,
      district: property.district,
      neighborhood: property.neighborhood,
      areaM2: property.areaM2,
      price: property.price,
      priceCurrency: property.priceCurrency,
      rooms: property.rooms,
      bathrooms: property.bathrooms,
      floor: property.floor,
      heatingType: property.heatingType,
      dues: property.dues,
      hasPool: property.hasPool,
      hasGym: property.hasGym,
      hasSecurity: property.hasSecurity,
      hasParking: property.hasParking,
      view: property.view,
      facade: property.facade,
      buildingAge: property.buildingAge,
      photoUrls: property.photoUrls,
    };
  }
}
