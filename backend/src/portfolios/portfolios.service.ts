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
}
