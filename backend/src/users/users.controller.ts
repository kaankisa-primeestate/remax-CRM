import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentProfileDto } from './dto/update-agent-profile.dto';
import { ChangePasswordDto } from '../auth/dto/change-password.dto';
import { ChangeEmailDto } from '../auth/dto/change-email.dto';
import { CreateBrokerDto } from '../auth/dto/create-broker.dto';
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

  // GET /api/users/agents/roster — HERKESE (Danisman dahil) acik, sadece
  // isim doner. Ofis Portfoyu gibi yerlerde "kimin ilani" gostermek icin.
  @Get('agents/roster')
  findAgentRoster() {
    return this.usersService.findAgentRoster();
  }

  // GET /api/users/me — HERKESE acik, kendi tam profilini doner (sifre
  // haric). Orn. Cari Ekstre sayfasinda kendi Prim Modeli rozetini
  // gostermek icin -- Broker'in listAgents'i gibi zengin veri lazim ama
  // Danisman kendi kendine bunu cagirabilmeli.
  @Get('me')
  async findMe(@CurrentUser() user: CurrentUserPayload) {
    const found = await this.usersService.findById(user.userId);
    if (!found) return null;
    const { passwordHash, ...safe } = found;
    return safe;
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
  setMonthlyDues(
    @Param('id') id: string,
    @Body('monthlyDuesAmount') monthlyDuesAmount: number,
    @Body('duesStartDate') duesStartDate?: string,
  ) {
    return this.usersService.setMonthlyDues(id, monthlyDuesAmount, duesStartDate);
  }

  // PATCH /api/users/agents/:id/profile — Broker kimlik/sirket bilgilerini gunceller
  @Patch('agents/:id/profile')
  @Roles(UserRole.BROKER)
  updateAgentProfile(@Param('id') id: string, @Body() dto: UpdateAgentProfileDto) {
    return this.usersService.updateAgentProfile(id, dto);
  }

  // POST /api/users/agents/:id/reset-password — Broker ACIL durumda
  // (e-posta calismiyor, danisman sahada vb.) aninda gecici bir sifre
  // uretir. Hicbir dis servise ihtiyac duymaz, aninda calisir.
  @Post('agents/:id/reset-password')
  @Roles(UserRole.BROKER)
  async brokerResetPassword(@Param('id') id: string) {
    const tempPassword = await this.usersService.brokerResetPassword(id);
    return { tempPassword };
  }

  // PATCH /api/users/agents/:id/active — Pasife al / aktiflestir (giris
  // engellenir, TUM veri korunur)
  @Patch('agents/:id/active')
  @Roles(UserRole.BROKER)
  setActive(@Param('id') id: string, @Body('isActive') isActive: boolean) {
    return this.usersService.setActive(id, isActive);
  }

  // DELETE /api/users/agents/:id — SADECE baglantili verisi (musteri/
  // portfoy/islem) yoksa izin verilir -- mukerrer/hatali olusturulmus
  // BOS kayitlar icin. Gercek is verisi olan hesap icin backend
  // reddeder, "Pasife Al" onerir.
  @Delete('agents/:id')
  @Roles(UserRole.BROKER)
  async removeAgent(@Param('id') id: string) {
    await this.usersService.removeAgent(id);
    return { success: true };
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

  // PATCH /api/users/change-email — SADECE Broker kendi giris e-postasini
  // degistirebilir (Danismanlarin e-postasi Broker tarafindan Danisman
  // Yonetimi sayfasindan zaten yonetiliyor).
  @Patch('change-email')
  async changeEmail(
    @Body() dto: ChangeEmailDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    await this.usersService.updateOwnEmail(
      user.userId,
      user.role,
      dto.currentPassword,
      dto.newEmail,
    );
    return { success: true };
  }

  // POST /api/users/brokers — SADECE mevcut bir Broker, YENI bir Yonetici
  // (is ortagi icin) hesabi olusturabilir.
  @Post('brokers')
  async createBroker(
    @Body() dto: CreateBrokerDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const broker = await this.usersService.createBroker(
      user.role,
      dto.name,
      dto.email,
      dto.password,
    );
    return broker;
  }
}
