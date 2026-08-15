import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { PropertyCommentsService } from './property-comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../auth/current-user.decorator';

// Bir portfoy hakkindaki Broker <-> Danisman yazismalari.
// Mahremiyet Duvari PropertyCommentsService icinde uygulanir.
@Controller('properties/:propertyId/comments')
@UseGuards(JwtAuthGuard)
export class PropertyCommentsController {
  constructor(private readonly propertyCommentsService: PropertyCommentsService) {}

  // GET /api/properties/:propertyId/comments
  @Get()
  findAll(@Param('propertyId') propertyId: string, @CurrentUser() user: CurrentUserPayload) {
    return this.propertyCommentsService.findAll(propertyId, user);
  }

  // POST /api/properties/:propertyId/comments
  @Post()
  create(
    @Param('propertyId') propertyId: string,
    @Body() dto: CreateCommentDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.propertyCommentsService.create(propertyId, dto, user);
  }
}
