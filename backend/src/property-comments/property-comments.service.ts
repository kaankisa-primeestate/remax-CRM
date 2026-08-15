import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PropertyComment } from './property-comment.entity';
import { Property } from '../portfolios/property.entity';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CurrentUserPayload } from '../auth/current-user.decorator';

@Injectable()
export class PropertyCommentsService {
  constructor(
    @InjectRepository(PropertyComment) private readonly commentRepo: Repository<PropertyComment>,
    @InjectRepository(Property) private readonly propertyRepo: Repository<Property>,
  ) {}

  // Portfoy erisim kontrolu -- Mahremiyet Duvari: bir Danisman sadece
  // kendi portfoyunun yazismalarini gorebilir/yazabilir, Broker tumune
  // erisebilir. (portfolios.service.ts'teki assertAccess ile ayni mantik.)
  private async assertPropertyAccess(propertyId: string, currentUser: CurrentUserPayload): Promise<void> {
    const property = await this.propertyRepo.findOne({ where: { id: propertyId } });
    if (!property) {
      throw new NotFoundException('Portföy bulunamadı');
    }
    if (currentUser.role === 'agent' && property.agentId !== currentUser.userId) {
      throw new ForbiddenException('Bu portföye erişim yetkiniz yok');
    }
  }

  async findAll(propertyId: string, currentUser: CurrentUserPayload): Promise<PropertyComment[]> {
    await this.assertPropertyAccess(propertyId, currentUser);
    return this.commentRepo.find({ where: { propertyId }, order: { createdAt: 'ASC' } });
  }

  async create(
    propertyId: string,
    dto: CreateCommentDto,
    currentUser: CurrentUserPayload,
  ): Promise<PropertyComment> {
    await this.assertPropertyAccess(propertyId, currentUser);
    const comment = this.commentRepo.create({
      propertyId,
      authorId: currentUser.userId,
      authorName: currentUser.name,
      authorRole: currentUser.role,
      message: dto.message,
    });
    return this.commentRepo.save(comment);
  }
}
