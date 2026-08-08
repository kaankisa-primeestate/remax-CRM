import { Repository } from 'typeorm';
import { Property } from './property.entity';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { CurrentUserPayload } from '../auth/current-user.decorator';
export interface FindPropertiesQuery {
    search?: string;
    propertyType?: string;
    listingType?: string;
    status?: string;
    district?: string;
    minPrice?: string;
    maxPrice?: string;
    minArea?: string;
    maxArea?: string;
    agentId?: string;
    rooms?: string;
    minBuildingAge?: string;
    maxBuildingAge?: string;
    heatingType?: string;
    view?: string;
    hasPool?: string;
    hasGym?: string;
    hasSecurity?: string;
    hasParking?: string;
    keyword?: string;
}
export declare class PortfoliosService {
    private readonly propertyRepo;
    constructor(propertyRepo: Repository<Property>);
    create(dto: CreatePropertyDto, currentUser: CurrentUserPayload): Promise<Property>;
    findAll(query: FindPropertiesQuery, currentUser: CurrentUserPayload): Promise<Property[]>;
    findOne(id: string, currentUser: CurrentUserPayload): Promise<Property>;
    update(id: string, dto: UpdatePropertyDto, currentUser: CurrentUserPayload): Promise<Property>;
    remove(id: string, currentUser: CurrentUserPayload): Promise<void>;
    private assertAccess;
}
