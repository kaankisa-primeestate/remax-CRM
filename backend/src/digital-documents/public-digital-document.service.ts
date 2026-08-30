import { BadRequestException, GoneException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DigitalDocument } from './digital-document.entity';

@Injectable()
export class PublicDigitalDocumentService {
  constructor(
    @InjectRepository(DigitalDocument) private readonly docRepo: Repository<DigitalDocument>,
  ) {}

  async getForSigning(token: string) {
    const doc = await this.docRepo.findOne({ where: { token } });
    if (!doc) {
      throw new NotFoundException('Bu link geçersiz veya süresi dolmuş');
    }
    if (doc.signed) {
      throw new GoneException('Bu belge zaten imzalanmış');
    }
    return { type: doc.type, data: doc.dataSnapshot };
  }

  async sign(
    token: string,
    dto: { signatureImage?: string; signedName?: string; method: 'draw' | 'type' },
    ip: string,
  ) {
    const doc = await this.docRepo.findOne({ where: { token } });
    if (!doc) {
      throw new NotFoundException('Bu link geçersiz veya süresi dolmuş');
    }
    if (doc.signed) {
      throw new GoneException('Bu belge zaten imzalanmış');
    }
    if (dto.method === 'draw' && !dto.signatureImage) {
      throw new BadRequestException('İmza çizilmedi');
    }
    if (dto.method === 'type' && !dto.signedName?.trim()) {
      throw new BadRequestException('İsim girilmedi');
    }

    doc.signed = true;
    doc.signedAt = new Date();
    doc.signatureImage = dto.method === 'draw' ? dto.signatureImage! : null;
    doc.signedName = dto.method === 'type' ? dto.signedName!.trim() : null;
    doc.signatureMethod = dto.method;
    doc.signedIp = ip;

    await this.docRepo.save(doc);
    return { success: true };
  }
}
