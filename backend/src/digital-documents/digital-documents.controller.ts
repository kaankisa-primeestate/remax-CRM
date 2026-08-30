import { Controller, Post, Param, UseGuards } from '@nestjs/common';
import { DigitalDocumentsService } from './digital-documents.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../auth/current-user.decorator';

@Controller('digital-documents')
@UseGuards(JwtAuthGuard)
export class DigitalDocumentsController {
  constructor(private readonly digitalDocumentsService: DigitalDocumentsService) {}

  // POST /api/digital-documents/authorization/:propertyId
  @Post('authorization/:propertyId')
  async createAuthorizationLink(
    @Param('propertyId') propertyId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const token = await this.digitalDocumentsService.createOrGetAuthorizationLink(propertyId, user);
    return { token };
  }
}
