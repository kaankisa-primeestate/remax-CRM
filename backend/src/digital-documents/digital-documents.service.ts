import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { DigitalDocument, DigitalDocumentType } from './digital-document.entity';
import { Property } from '../portfolios/property.entity';
import { User } from '../users/user.entity';
import { CurrentUserPayload } from '../auth/current-user.decorator';

// RE/MAX Prime'in sabit isletme bilgileri -- her belgede AYNI, elle
// girilmesine gerek yok.
const OFFICE_INFO = {
  unvan: 'AKA EMLAK DANIŞMANLIK İNŞAAT TİC.LTD.ŞTİ',
  vergiDairesi: 'ERENKÖY / 0111358545',
  telefon: '0 (216) 372 74 72',
  email: 'info@remaxprime.com.tr',
  adres: 'Bostancı Mah. Tarık-i Has Sk. No:2 D.7 Bostancı-Kadıköy/ İstanbul',
  yetkiBelgeNo: '3417567',
};

@Injectable()
export class DigitalDocumentsService {
  constructor(
    @InjectRepository(DigitalDocument) private readonly docRepo: Repository<DigitalDocument>,
    @InjectRepository(Property) private readonly propertyRepo: Repository<Property>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  // Bir portfoy icin Yetkilendirme Sozlesmesi linki uretir/dondurur --
  // idempotent: bu portfoy icin ZATEN imzalanmamis bir belge varsa
  // AYNISINI dondurur, her tiklamada yeni kayit acmaz.
  async createOrGetAuthorizationLink(propertyId: string, currentUser: CurrentUserPayload): Promise<string> {
    const property = await this.propertyRepo.findOne({ where: { id: propertyId } });
    if (!property) {
      throw new NotFoundException('Portföy bulunamadı');
    }
    if (currentUser.role === 'agent' && property.agentId !== currentUser.userId) {
      throw new ForbiddenException('Bu portföye erişim yetkiniz yok');
    }
    if (!property.ownerName) {
      throw new BadRequestException('Bu portföyde mülk sahibi bilgisi tanımlı değil');
    }

    const existing = await this.docRepo.findOne({
      where: { propertyId, type: DigitalDocumentType.AUTHORIZATION_SALE, signed: false },
    });
    if (existing) return existing.token;

    const agent = await this.userRepo.findOne({ where: { id: property.agentId || currentUser.userId } });
    const extra = property.extraAttributes || {};

    const dataSnapshot = {
      musteriAdi: property.ownerName,
      musteriTelefon: property.ownerPhone,
      danismanAdi: agent?.name || null,
      ofis: OFFICE_INFO,
      gayrimenkul: {
        baslik: property.title,
        il: property.province,
        ilce: property.district,
        mahalle: property.neighborhood,
        ada: extra.ada || null,
        parsel: extra.parsel || null,
        bagimsizBolumNo: extra.bagimsizBolumNo || null,
        nitelik: property.propertyType,
        sahiplikOrani: extra.sahiplikOrani || null,
        ipotekDetay: extra.ipotekDetay || null,
        hacizDetay: extra.hacizDetay || null,
        imarIskanDurumu: extra.imarIskanDurumu || null,
        odaSayisi: property.rooms,
        netM2: extra.netM2 || null,
        toplamM2: property.areaM2,
        salonM2: extra.salonM2 || null,
        mutfakM2: extra.mutfakM2 || null,
        antreM2: extra.antreM2 || null,
        balkonM2: extra.balkonM2 || null,
        tuvaletM2: extra.tuvaletM2 || null,
        kat: property.floor,
        binaYasi: property.buildingAge,
        isitmaSistemi: property.heatingType,
        sogutmaSistemi: extra.sogutma ? 'Var' : 'Yok',
        cephe: property.facade,
        manzara: property.view,
        asansor: extra.asansor ? 'Var' : 'Yok',
        otopark: property.hasParking ? 'Var' : 'Yok',
        sporSalonu: property.hasGym ? 'Var' : 'Yok',
        yuzmeHavuzu: property.hasPool ? 'Var' : 'Yok',
        ozelGuvenlik: property.hasSecurity ? 'Var' : 'Yok',
        jenerator: extra.jenerator ? 'Var' : 'Yok',
        somine: extra.somine ? 'Var' : 'Yok',
        topluTasima: extra.topluTasima ? 'Var' : 'Yok',
        satisBedeli: property.price,
        hizmetBedeliOrani: '%2 + KDV',
      },
    };

    const doc = this.docRepo.create({
      type: DigitalDocumentType.AUTHORIZATION_SALE,
      propertyId: property.id,
      agentId: property.agentId || currentUser.userId,
      token: randomUUID(),
      dataSnapshot,
    });
    const saved = await this.docRepo.save(doc);
    return saved.token;
  }
}
