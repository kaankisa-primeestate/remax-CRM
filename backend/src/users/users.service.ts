import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User, UserRole } from './user.entity';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentProfileDto } from './dto/update-agent-profile.dto';

const SALT_ROUNDS = 10;

@Injectable()
export class UsersService implements OnModuleInit {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  // Sistemde hiç kullanıcı yoksa (ilk kurulum), otomatik olarak bir Broker
  // hesabı oluşturur. Böylece giriş yapabilmek için elle veritabanına
  // veri eklemeye gerek kalmaz.
  async onModuleInit() {
    const count = await this.userRepo.count();
    if (count > 0) return;

    const defaultEmail = process.env.DEFAULT_BROKER_EMAIL || 'admin@remax.local';
    const defaultPassword = process.env.DEFAULT_BROKER_PASSWORD || 'broker123';

    const passwordHash = await bcrypt.hash(defaultPassword, SALT_ROUNDS);
    await this.userRepo.save(
      this.userRepo.create({
        name: 'Ofis Sahibi',
        email: defaultEmail,
        passwordHash,
        role: UserRole.BROKER,
      }),
    );

    this.logger.warn(
      `İlk kurulum: varsayılan Broker hesabı oluşturuldu → e-posta: ${defaultEmail} / şifre: ${defaultPassword} — LÜTFEN GİRİŞ YAPTIKTAN SONRA ŞİFRENİZİ DEĞİŞTİRİN.`,
    );
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { email } });
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { id } });
  }

  // Mevcut sifreyi dogrulayip yenisini kaydeder
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Kullanici bulunamadi');
    }
    const matches = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!matches) {
      throw new UnauthorizedException('Mevcut sifre hatali');
    }
    user.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await this.userRepo.save(user);
  }

  // Sadece Broker çağırabilir (bkz. users.controller.ts + RolesGuard)
  async createAgent(dto: CreateAgentDto): Promise<Omit<User, 'passwordHash'>> {
    const existing = await this.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Bu e-posta ile kayıtlı bir kullanıcı zaten var');
    }
    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const user = await this.userRepo.save(
      this.userRepo.create({
        name: dto.name,
        email: dto.email,
        passwordHash,
        role: UserRole.AGENT,
        phone: dto.phone || null,
        address: dto.address || null,
        birthDate: dto.birthDate || null,
        nationalId: dto.nationalId || null,
        companyName: dto.companyName || null,
        taxId: dto.taxId || null,
      }),
    );
    const { passwordHash: _omit, ...safeUser } = user;
    return safeUser;
  }

  // Broker'ın danışman listesini görmesi için (şifre hash'i asla döndürülmez)
  async findAllAgents(): Promise<Omit<User, 'passwordHash'>[]> {
    const agents = await this.userRepo.find({
      where: { role: UserRole.AGENT },
      order: { name: 'ASC' },
    });
    return agents.map(({ passwordHash, ...rest }) => rest);
  }

  // Herhangi bir giris yapmis kullanici (Danisman dahil) erisebilir --
  // SADECE isim doner, telefon/adres/TC/sirket gibi hassas bilgi ICERMEZ.
  // Ofis Portfoyu gibi yerlerde "kimin ilani" bilgisini gostermek icin.
  async findAgentRoster(): Promise<{ id: string; name: string }[]> {
    const agents = await this.userRepo.find({
      where: { role: UserRole.AGENT },
      order: { name: 'ASC' },
    });
    return agents.map((a) => ({ id: a.id, name: a.name }));
  }

  // Broker, bir danismanin aylik hedefini belirler/gunceller.
  async setMonthlyTarget(agentId: string, monthlyTarget: number): Promise<Omit<User, 'passwordHash'>> {
    const agent = await this.userRepo.findOne({ where: { id: agentId, role: UserRole.AGENT } });
    if (!agent) {
      throw new NotFoundException('Danışman bulunamadı');
    }
    agent.monthlyTarget = monthlyTarget;
    const saved = await this.userRepo.save(agent);
    const { passwordHash, ...rest } = saved;
    return rest;
  }

  // Broker, bir danismanin aylik aidat tutarini belirler/gunceller.
  async setMonthlyDues(agentId: string, monthlyDuesAmount: number): Promise<Omit<User, 'passwordHash'>> {
    const agent = await this.userRepo.findOne({ where: { id: agentId, role: UserRole.AGENT } });
    if (!agent) {
      throw new NotFoundException('Danışman bulunamadı');
    }
    agent.monthlyDuesAmount = monthlyDuesAmount;
    const saved = await this.userRepo.save(agent);
    const { passwordHash, ...rest } = saved;
    return rest;
  }

  // Broker, sonradan kimlik/sirket bilgilerini (telefon, adres, TC no,
  // sirket adi, vergi no vb.) doldurabilir/duzeltebilir -- danisman
  // olusturulurken girilmemis olabilir.
  async updateAgentProfile(
    agentId: string,
    dto: UpdateAgentProfileDto,
  ): Promise<Omit<User, 'passwordHash'>> {
    const agent = await this.userRepo.findOne({ where: { id: agentId, role: UserRole.AGENT } });
    if (!agent) {
      throw new NotFoundException('Danışman bulunamadı');
    }
    Object.assign(agent, dto);
    const saved = await this.userRepo.save(agent);
    const { passwordHash, ...rest } = saved;
    return rest;
  }
}
