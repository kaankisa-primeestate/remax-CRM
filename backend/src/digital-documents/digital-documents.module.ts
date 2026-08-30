import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DigitalDocument } from './digital-document.entity';
import { Property } from '../portfolios/property.entity';
import { User } from '../users/user.entity';
import { DigitalDocumentsService } from './digital-documents.service';
import { DigitalDocumentsController } from './digital-documents.controller';
import { PublicDigitalDocumentService } from './public-digital-document.service';
import { PublicDigitalDocumentController } from './public-digital-document.controller';

@Module({
  imports: [TypeOrmModule.forFeature([DigitalDocument, Property, User])],
  providers: [DigitalDocumentsService, PublicDigitalDocumentService],
  controllers: [DigitalDocumentsController, PublicDigitalDocumentController],
})
export class DigitalDocumentsModule {}
