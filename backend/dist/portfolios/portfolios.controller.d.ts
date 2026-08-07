import { PortfoliosService } from './portfolios.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { CurrentUserPayload } from '../auth/current-user.decorator';
export declare class PortfoliosController {
    private readonly portfoliosService;
    constructor(portfoliosService: PortfoliosService);
    create(dto: CreatePropertyDto, user: CurrentUserPayload): Promise<import("./property.entity").Property>;
    findAll(user: CurrentUserPayload, search?: string, propertyType?: string, listingType?: string, status?: string, district?: string, minPrice?: string, maxPrice?: string, minArea?: string, maxArea?: string, agentId?: string): Promise<import("./property.entity").Property[]>;
    findOne(id: string, user: CurrentUserPayload): Promise<import("./property.entity").Property>;
    update(id: string, dto: UpdatePropertyDto, user: CurrentUserPayload): Promise<import("./property.entity").Property>;
    remove(id: string, user: CurrentUserPayload): Promise<void>;
}
