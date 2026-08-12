import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { MatchingService } from './matching.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../auth/current-user.decorator';

@Controller()
@UseGuards(JwtAuthGuard)
export class MatchingController {
  constructor(private readonly matchingService: MatchingService) {}

  // GET /api/customers/:id/matching-properties
  @Get('customers/:id/matching-properties')
  matchingProperties(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.matchingService.findMatchingPropertiesForCustomer(id, user);
  }

  // GET /api/properties/:id/matching-customers
  @Get('properties/:id/matching-customers')
  matchingCustomers(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.matchingService.findMatchingCustomersForProperty(id, user);
  }
}
