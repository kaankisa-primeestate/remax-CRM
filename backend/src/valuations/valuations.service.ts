import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import PDFDocument = require('pdfkit');
import { PropertyValuation, ValuationStatus } from './valuation.entity';
import { ValuationComp, CompType } from './valuation-comp.entity';
import { CreateValuationDto } from './dto/create-valuation.dto';
import { UpdateValuationDto } from './dto/update-valuation.dto';
import { AddCompDto } from './dto/add-comp.dto';
import { UpdateCompDto } from './dto/update-comp.dto';
import { Property, PropertyStatus } from '../portfolios/property.entity';
import { CurrentUserPayload } from '../auth/current-user.decorator';

// Otomatik eslestirmede kac sonuca kadar getirilecegi (fazlasi danismani
// bogar, azi yetersiz kalir -- 6 makul bir denge).
const MAX_AUTO_MATCHES = 6;
// Alan (m2) toleransi -- subject'in +-%25'i araliginda aranir.
const AREA_TOLERANCE = 0.25;

@Injectable()
export class ValuationsService {
  constructor(
    @InjectRepository(PropertyValuation) private readonly valuationRepo: Repository<PropertyValuation>,
    @InjectRepository(ValuationComp) private readonly compRepo: Repository<ValuationComp>,
    @InjectRepository(Property) private readonly propertyRepo: Repository<Property>,
  ) {}

  async create(dto: CreateValuationDto, currentUser: CurrentUserPayload): Promise<PropertyValuation> {
    let subject: Partial<PropertyValuation>;

    if (dto.propertyId) {
      // Mevcut bir portfoyden baslatiliyor -- subject alanlari o mulkten kopyalanir.
      const property = await this.propertyRepo.findOne({ where: { id: dto.propertyId } });
      if (!property) {
        throw new NotFoundException('Portföy bulunamadı');
      }
      subject = {
        propertyId: property.id,
        subjectTitle: property.title,
        subjectProvince: property.province,
        subjectDistrict: property.district,
        subjectNeighborhood: property.neighborhood,
        subjectAreaM2: property.areaM2,
        subjectRooms: property.rooms,
        subjectBuildingAge: property.buildingAge,
        subjectFloor: property.floor,
      };
    } else {
      // Sistemde henuz kayitli olmayan bir mulk icin (orn. potansiyel bir
      // satici adayini ikna etmek uzere) -- bu durumda temel alanlar zorunlu.
      if (!dto.subjectTitle || !dto.subjectProvince || !dto.subjectDistrict || !dto.subjectAreaM2) {
        throw new BadRequestException(
          'Sistemde kayıtlı bir portföy seçmediyseniz, başlık/il/ilçe/m² bilgilerini girmelisiniz',
        );
      }
      subject = {
        propertyId: null,
        subjectTitle: dto.subjectTitle,
        subjectProvince: dto.subjectProvince,
        subjectDistrict: dto.subjectDistrict,
        subjectNeighborhood: dto.subjectNeighborhood || null,
        subjectAreaM2: dto.subjectAreaM2,
        subjectRooms: dto.subjectRooms || null,
        subjectBuildingAge: dto.subjectBuildingAge ?? null,
        subjectFloor: dto.subjectFloor || null,
      };
    }

    const valuation = this.valuationRepo.create({
      ...subject,
      agentId: currentUser.userId,
      subjectNotes: dto.subjectNotes || null,
      status: ValuationStatus.DRAFT,
    });
    const saved = await this.valuationRepo.save(valuation);

    // Olusturulur olusturulmaz otomatik eslestirmeyi tetikle -- danisman
    // hicbir ek tiklama yapmadan hazir karsilastirmalarla karsilasir.
    await this.autoMatchComps(saved, currentUser);

    return saved;
  }

  async findAll(currentUser: CurrentUserPayload): Promise<PropertyValuation[]> {
    const where = currentUser.role === 'agent' ? { agentId: currentUser.userId } : {};
    return this.valuationRepo.find({ where, order: { updatedAt: 'DESC' } });
  }

  private async findOneOwned(id: string, currentUser: CurrentUserPayload): Promise<PropertyValuation> {
    const valuation = await this.valuationRepo.findOne({ where: { id } });
    if (!valuation) {
      throw new NotFoundException('Analiz bulunamadı');
    }
    if (currentUser.role === 'agent' && valuation.agentId !== currentUser.userId) {
      throw new ForbiddenException('Bu analize erişim yetkiniz yok');
    }
    return valuation;
  }

  async findOne(
    id: string,
    currentUser: CurrentUserPayload,
  ): Promise<{ valuation: PropertyValuation; comps: ValuationComp[] }> {
    const valuation = await this.findOneOwned(id, currentUser);
    const comps = await this.compRepo.find({ where: { valuationId: id }, order: { createdAt: 'ASC' } });
    return { valuation, comps };
  }

  async update(id: string, dto: UpdateValuationDto, currentUser: CurrentUserPayload): Promise<PropertyValuation> {
    const valuation = await this.findOneOwned(id, currentUser);
    Object.assign(valuation, dto);
    return this.valuationRepo.save(valuation);
  }

  async remove(id: string, currentUser: CurrentUserPayload): Promise<void> {
    const valuation = await this.findOneOwned(id, currentUser);
    await this.compRepo.delete({ valuationId: id });
    await this.valuationRepo.remove(valuation);
  }

  // --- Otomatik Eslestirme ---
  // Kendi veritabanimizda ayni ilcede, alan (m2) +-%25 toleransinda ve
  // (varsa) ayni oda sayisinda olan SATILDI/KIRALANDI/AKTIF mulkleri
  // bulup otomatik comp olarak ekler. Turkiye'de resmi satis fiyati
  // verisi kamuya acik olmadigindan AKTIF ilanlar da (asking price
  // olarak isaretlenerek) dahil edilir -- yoksa cogu analizde hic
  // karsilastirma cikmaz.
  async autoMatchComps(valuation: PropertyValuation, currentUser: CurrentUserPayload): Promise<ValuationComp[]> {
    const minArea = Number(valuation.subjectAreaM2) * (1 - AREA_TOLERANCE);
    const maxArea = Number(valuation.subjectAreaM2) * (1 + AREA_TOLERANCE);

    const qb = this.propertyRepo
      .createQueryBuilder('p')
      .where('p.district = :district', { district: valuation.subjectDistrict })
      .andWhere('p.areaM2 BETWEEN :minArea AND :maxArea', { minArea, maxArea })
      .andWhere('p.status IN (:...statuses)', {
        statuses: [PropertyStatus.SOLD, PropertyStatus.RENTED, PropertyStatus.ACTIVE],
      });
    if (valuation.propertyId) {
      qb.andWhere('p.id != :excludeId', { excludeId: valuation.propertyId });
    }
    if (valuation.subjectRooms) {
      qb.andWhere('p.rooms = :rooms', { rooms: valuation.subjectRooms });
    }
    const matches = await qb.orderBy('p.updatedAt', 'DESC').take(MAX_AUTO_MATCHES).getMany();

    const compTypeFor = (status: PropertyStatus): CompType => {
      if (status === PropertyStatus.SOLD) return CompType.SOLD;
      if (status === PropertyStatus.RENTED) return CompType.RENTED;
      return CompType.ACTIVE_LISTING;
    };

    const comps = matches.map((p) =>
      this.compRepo.create({
        valuationId: valuation.id,
        sourcePropertyId: p.id,
        title: p.title,
        district: p.district,
        neighborhood: p.neighborhood,
        areaM2: p.areaM2,
        rooms: p.rooms,
        price: p.price,
        compType: compTypeFor(p.status),
        transactionDate:
          p.status === PropertyStatus.SOLD || p.status === PropertyStatus.RENTED
            ? (p.statusChangedAt ? p.statusChangedAt.toISOString().slice(0, 10) : null)
            : null,
        sourceNote: 'Kendi veritabanımız (otomatik eşleşti)',
        isAutoMatched: true,
        addedByName: currentUser.name,
      }),
    );

    if (comps.length === 0) {
      return [];
    }
    return this.compRepo.save(comps);
  }

  // Subject bilgisi (orn. m2, ilce) sonradan degistirildiyse -- eski
  // OTOMATIK eslesenleri silip yeniden arar. Danismanin ELLE ekledigi
  // comps'lara dokunulmaz (onlar danismanin kendi arastirmasi, sistem
  // silmeye yetkili degil).
  async rematch(id: string, currentUser: CurrentUserPayload): Promise<ValuationComp[]> {
    const valuation = await this.findOneOwned(id, currentUser);
    await this.compRepo.delete({ valuationId: id, isAutoMatched: true });
    return this.autoMatchComps(valuation, currentUser);
  }

  async addComp(id: string, dto: AddCompDto, currentUser: CurrentUserPayload): Promise<ValuationComp> {
    await this.findOneOwned(id, currentUser);
    const comp = this.compRepo.create({
      valuationId: id,
      sourcePropertyId: dto.sourcePropertyId || null,
      title: dto.title,
      district: dto.district || null,
      neighborhood: dto.neighborhood || null,
      areaM2: dto.areaM2 ?? null,
      rooms: dto.rooms || null,
      price: dto.price,
      compType: dto.compType,
      transactionDate: dto.transactionDate || null,
      sourceNote: dto.sourceNote || 'Danışman tarafından elle eklendi',
      isAutoMatched: false,
      addedByName: currentUser.name,
    });
    return this.compRepo.save(comp);
  }

  async updateComp(compId: string, dto: UpdateCompDto, currentUser: CurrentUserPayload): Promise<ValuationComp> {
    const comp = await this.compRepo.findOne({ where: { id: compId } });
    if (!comp) {
      throw new NotFoundException('Karşılaştırma kaydı bulunamadı');
    }
    await this.findOneOwned(comp.valuationId, currentUser); // Mahremiyet Duvari kontrolu
    Object.assign(comp, dto);
    return this.compRepo.save(comp);
  }

  async removeComp(compId: string, currentUser: CurrentUserPayload): Promise<void> {
    const comp = await this.compRepo.findOne({ where: { id: compId } });
    if (!comp) {
      throw new NotFoundException('Karşılaştırma kaydı bulunamadı');
    }
    await this.findOneOwned(comp.valuationId, currentUser);
    await this.compRepo.remove(comp);
  }

  // --- PDF Raporu ---
  // pdfkit ile sunucu tarafinda dogrudan olusturulur, disk'e yazmadan
  // bellekte bir Buffer olarak doner (controller bunu HTTP yaniti olarak
  // gonderir).
  async generatePdf(id: string, currentUser: CurrentUserPayload): Promise<Buffer> {
    const { valuation, comps } = await this.findOne(id, currentUser);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const money = (n: number | null) =>
        n == null ? '—' : `${Number(n).toLocaleString('tr-TR')} ₺`;

      doc.fontSize(18).font('Helvetica-Bold').text('Piyasa Değer Analizi', { align: 'center' });
      doc.moveDown(0.3);
      doc
        .fontSize(9)
        .font('Helvetica-Oblique')
        .fillColor('#666666')
        .text(
          'Bu belge resmi bir SPK Gayrimenkul Değerleme Raporu değildir. Danışmanın piyasa gözlemine ve karşılaştırmalı verilere dayanan gayri resmi bir fiyat analizidir (Karşılaştırmalı Piyasa Analizi / KPA).',
          { align: 'center' },
        );
      doc.fillColor('#000000');
      doc.moveDown(1);

      doc.fontSize(13).font('Helvetica-Bold').text('Mülk Bilgileri');
      doc.moveDown(0.3);
      doc.fontSize(10).font('Helvetica');
      doc.text(`Başlık: ${valuation.subjectTitle}`);
      doc.text(`Konum: ${valuation.subjectProvince} / ${valuation.subjectDistrict}${valuation.subjectNeighborhood ? ' / ' + valuation.subjectNeighborhood : ''}`);
      doc.text(`Metrekare: ${valuation.subjectAreaM2} m²`);
      if (valuation.subjectRooms) doc.text(`Oda Sayısı: ${valuation.subjectRooms}`);
      if (valuation.subjectBuildingAge != null) doc.text(`Bina Yaşı: ${valuation.subjectBuildingAge}`);
      if (valuation.subjectFloor) doc.text(`Kat: ${valuation.subjectFloor}`);
      if (valuation.subjectNotes) doc.text(`Notlar: ${valuation.subjectNotes}`);
      doc.moveDown(1);

      doc.fontSize(13).font('Helvetica-Bold').text('Karşılaştırma Tablosu (Comps)');
      doc.moveDown(0.3);
      if (comps.length === 0) {
        doc.fontSize(10).font('Helvetica-Oblique').text('Henüz karşılaştırma eklenmemiş.');
      } else {
        const typeLabels: Record<string, string> = {
          sold: 'Satıldı',
          rented: 'Kiralandı',
          active_listing: 'Aktif İlan',
        };
        doc.fontSize(9).font('Helvetica-Bold');
        doc.text('Başlık / Konum', 50, doc.y, { continued: true, width: 180 });
        doc.text('m² / Oda', 230, doc.y, { continued: true, width: 70 });
        doc.text('Fiyat', 300, doc.y, { continued: true, width: 90 });
        doc.text('Durum', 390, doc.y, { continued: true, width: 80 });
        doc.text('Kaynak', 470, doc.y, { width: 90 });
        doc.moveDown(0.2);
        doc.moveTo(50, doc.y).lineTo(560, doc.y).strokeColor('#cccccc').stroke();
        doc.moveDown(0.3);

        doc.font('Helvetica').fontSize(8.5);
        comps.forEach((c) => {
          const startY = doc.y;
          doc.text(`${c.title}${c.district ? ' — ' + c.district : ''}`, 50, startY, { width: 180 });
          const afterTitleY = doc.y;
          doc.text(`${c.areaM2 || '—'} m² / ${c.rooms || '—'}`, 230, startY, { width: 70 });
          doc.text(money(Number(c.price)), 300, startY, { width: 90 });
          doc.text(typeLabels[c.compType] || c.compType, 390, startY, { width: 80 });
          doc.text(c.sourceNote || '—', 470, startY, { width: 90 });
          doc.y = Math.max(afterTitleY, doc.y);
          doc.moveDown(0.4);
        });
      }
      doc.moveDown(1);

      doc.fontSize(13).font('Helvetica-Bold').text('Sonuç');
      doc.moveDown(0.3);
      doc.fontSize(11).font('Helvetica-Bold');
      doc.text(`Tahmini Değer Aralığı: ${money(valuation.estimatedValueMin ? Number(valuation.estimatedValueMin) : null)} — ${money(valuation.estimatedValueMax ? Number(valuation.estimatedValueMax) : null)}`);
      if (valuation.conclusionNotes) {
        doc.moveDown(0.3);
        doc.fontSize(10).font('Helvetica').text(valuation.conclusionNotes);
      }

      doc.moveDown(2);
      doc
        .fontSize(8)
        .font('Helvetica-Oblique')
        .fillColor('#999999')
        .text(`Rapor tarihi: ${new Date().toLocaleDateString('tr-TR')} — RE/MAX Bostancı`, { align: 'center' });

      doc.end();
    });
  }
}
