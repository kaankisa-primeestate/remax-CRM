import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateAgentDto } from './dto/create-agent.dto';
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
}
