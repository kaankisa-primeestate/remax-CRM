import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PropertyComment } from './property-comment.entity';
import { Property } from '../portfolios/property.entity';
import { PropertyCommentsService } from './property-comments.service';
import { PropertyCommentsController } from './property-comments.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PropertyComment, Property])],
  providers: [PropertyCommentsService],
  controllers: [PropertyCommentsController],
})
export class PropertyCommentsModule {}
