import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateAgentDto } from './dto/create-agent.dto';
import { ChangePasswordDto } from '../auth/dto/change-password.dto';
import { CurrentUser, CurrentUserPayload } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from './user.entity';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // GET /api/users/agents — Broker'ın danışman listesini görmesi için
  @Get('agents')
  @Roles(UserRole.BROKER)
  findAllAgents() {
    return this.usersService.findAllAgents();
  }

  // POST /api/users/agents — Broker yeni bir danışman hesabı oluşturur
  @Post('agents')
  @Roles(UserRole.BROKER)
  createAgent(@Body() dto: CreateAgentDto) {
    return this.usersService.createAgent(dto);
  }

  // PATCH /api/users/agents/:id/target — Broker bir danismanin aylik hedefini belirler
  @Patch('agents/:id/target')
  @Roles(UserRole.BROKER)
  setMonthlyTarget(@Param('id') id: string, @Body('monthlyTarget') monthlyTarget: number) {
    return this.usersService.setMonthlyTarget(id, monthlyTarget);
  }

  // PATCH /api/users/agents/:id/dues — Broker bir danismanin aylik aidat tutarini belirler
  @Patch('agents/:id/dues')
  @Roles(UserRole.BROKER)
  setMonthlyDues(@Param('id') id: string, @Body('monthlyDuesAmount') monthlyDuesAmount: number) {
    return this.usersService.setMonthlyDues(id, monthlyDuesAmount);
  }

  // PATCH /api/users/change-password — Broker veya Danisman kendi sifresini degistirir
  @Patch('change-password')
  async changePassword(
    @Body() dto: ChangePasswordDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    await this.usersService.changePassword(
      user.userId,
      dto.currentPassword,
      dto.newPassword,
    );
    return { success: true };
  }
}
