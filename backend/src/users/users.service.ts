import {
  BadRequestException,
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
import * as crypto from 'crypto';
import { User, UserRole } from './user.entity';
import { Customer } from '../customers/customer.entity';
import { Property } from '../portfolios/property.entity';
import { Transaction } from '../transactions/transaction.entity';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentProfileDto } from './dto/update-agent-profile.dto';

const SALT_ROUNDS = 10;

@Injectable()
export class UsersService implements OnModuleInit {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    @InjectRepository(Property)
    private readonly propertyRepo: Repository<Property>,
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
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
      // BadRequestException (400) kullaniyoruz, UnauthorizedException (401)
      // DEGIL -- sistemde 401 gelince kullaniciyi otomatik cikis yaptirip
      // login'e yonlendiren genel bir kural var (token suresi doldu
      // senaryosu icin). "Mevcut sifre yanlis girildi" ile "oturumun
      // gecersiz" birbirinden TAMAMEN farkli durumlar -- 401 kullanmak,
      // kullaniciyi gercek hata mesajini hic gormeden anlik olarak
      // cikisa zorluyordu (gercek bug, canli ortamda tespit edildi).
      throw new BadRequestException('Mevcut şifre hatalı');
    }
    user.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    user.passwordChangedAt = new Date();
    await this.userRepo.save(user);
  }

  async setResetToken(userId: string, tokenHash: string, expiresAt: Date): Promise<void> {
    await this.userRepo.update(userId, { resetTokenHash: tokenHash, resetTokenExpiresAt: expiresAt });
  }

  async setPasswordAndClearResetToken(userId: string, newPassword: string): Promise<void> {
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await this.userRepo.update(userId, {
      passwordHash,
      resetTokenHash: null,
      resetTokenExpiresAt: null,
      passwordChangedAt: new Date(),
    });
  }

  // Broker acil durumda (danisman sifresini unuttu, e-posta calismiyor
  // vb.) aninda yeni bir GECICI sifre uretir -- hicbir dis servise
  // ihtiyac duymadan, ayni an calisan bir cozum. Broker bu sifreyi
  // ekranda BIR KEZ gorur, telefonla/WhatsApp'tan danismana iletir.
  async brokerResetPassword(agentId: string): Promise<string> {
    const user = await this.userRepo.findOne({ where: { id: agentId } });
    if (!user) {
      throw new NotFoundException('Danışman bulunamadı');
    }
    const tempPassword = crypto.randomBytes(6).toString('base64url'); // ~8 karakter, okunabilir
    user.passwordHash = await bcrypt.hash(tempPassword, SALT_ROUNDS);
    user.passwordChangedAt = new Date();
    user.resetTokenHash = null;
    user.resetTokenExpiresAt = null;
    await this.userRepo.save(user);
    return tempPassword;
  }

  // Pasife alma -- danisman giris yapamaz ama TUM verisi korunur.
  async setActive(agentId: string, isActive: boolean): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id: agentId } });
    if (!user) {
      throw new NotFoundException('Danışman bulunamadı');
    }
    user.isActive = isActive;
    await this.userRepo.save(user);
  }

  // Kalici silme -- SADECE baglantili hicbir veri (musteri/portfoy/islem)
  // yoksa izin verilir. Gercek is verisi olan bir hesabin silinmesi,
  // o danismana ait tum gecmisin (komisyon, cari hesap vb.) tutarsiz
  // kalmasina yol acar -- bu yuzden boyle durumlarda Pasife Alma
  // ZORUNLU tutulur, silme sadece GERCEKTEN bos (mukerrer kayit gibi)
  // hesaplar icindir.
  async removeAgent(agentId: string): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id: agentId } });
    if (!user) {
      throw new NotFoundException('Danışman bulunamadı');
    }
    const [customerCount, propertyCount, transactionCount] = await Promise.all([
      this.customerRepo.count({ where: { agentId } }),
      this.propertyRepo.count({ where: { agentId } }),
      this.transactionRepo.count({ where: { agentId } }),
    ]);
    if (customerCount > 0 || propertyCount > 0 || transactionCount > 0) {
      throw new ConflictException(
        `Bu danışmanın ${customerCount} müşteri, ${propertyCount} portföy, ${transactionCount} işlem kaydı var — güvenlik nedeniyle silinemez. Bunun yerine "Pasife Al" kullanın.`,
      );
    }
    await this.userRepo.remove(user);
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
        phone: dto.phone,
        address: dto.address || null,
        birthDate: dto.birthDate || null,
        nationalId: dto.nationalId || null,
        companyName: dto.companyName || null,
        taxId: dto.taxId || null,
        profilePhotoUrl: dto.profilePhotoUrl || null,
        companyType: dto.companyType || null,
        taxOffice: dto.taxOffice || null,
        mykCertificateNo: dto.mykCertificateNo || null,
        realEstateLicenseUrl: dto.realEstateLicenseUrl || null,
        officeName: dto.officeName || 'RE/MAX Bostancı',
        commissionShareType: dto.commissionShareType || null,
        commissionSharePercentage: dto.commissionSharePercentage ?? null,
        contractStartDate: dto.contractStartDate || null,
        mentorAgentId: dto.mentorAgentId || null,
        monthlyDuesAmount: dto.monthlyDuesAmount ?? null,
        powerStartCompleted: dto.powerStartCompleted ?? false,
        powerStartCertificateNo: dto.powerStartCertificateNo || null,
        powerStartCertificateDate: dto.powerStartCertificateDate || null,
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
