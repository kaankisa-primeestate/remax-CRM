import { Controller, Get, UseGuards } from '@nestjs/common';
import { CashFlowService } from './cash-flow.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user.entity';

@Controller('cash-flow')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.BROKER)
export class CashFlowController {
  constructor(private readonly service: CashFlowService) {}

  @Get('forecast')
  getForecast() {
    return this.service.getForecast();
  }
}
