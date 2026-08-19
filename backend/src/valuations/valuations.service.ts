import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as path from 'path';
import PDFDocument = require('pdfkit');
import { PropertyValuation, ValuationStatus } from './valuation.entity';
import { ValuationComp, CompType } from './valuation-comp.entity';
import { CreateValuationDto } from './dto/create-valuation.dto';
import { UpdateValuationDto } from './dto/update-valuation.dto';
import { AddCompDto } from './dto/add-comp.dto';
import { UpdateCompDto } from './dto/update-comp.dto';
import { Property, PropertyStatus } from '../portfolios/property.entity';
import { User } from '../users/user.entity';
import { CurrentUserPayload } from '../auth/current-user.decorator';

// Otomatik eslestirmede kac sonuca kadar getirilecegi (fazlasi danismani
// bogar, azi yetersiz kalir -- 6 makul bir denge).
const MAX_AUTO_MATCHES = 6;
// Alan (m2) toleransi -- subject'in +-%25'i araliginda aranir.
const AREA_TOLERANCE = 0.25;

export type ConfidenceLevel = 'high' | 'medium' | 'low';

@Injectable()
export class ValuationsService {
  constructor(
    @InjectRepository(PropertyValuation) private readonly valuationRepo: Repository<PropertyValuation>,
    @InjectRepository(ValuationComp) private readonly compRepo: Repository<ValuationComp>,
    @InjectRepository(Property) private readonly propertyRepo: Repository<Property>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
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
        // Tapu turu Property'de zaten var (deedStatus) -- otomatik kopyalanir.
        // Ada/Parsel ve Arsa Payi Property'de HENUZ TAKIP EDILMIYOR --
        // danisman analiz ekranindan elle doldurur (bkz. Bolum 4, sartname notu).
        subjectDeedType: property.deedStatus || null,
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
        subjectDeedType: dto.subjectDeedType || null,
      };
    }

    const valuation = this.valuationRepo.create({
      ...subject,
      agentId: currentUser.userId,
      subjectNotes: dto.subjectNotes || null,
      subjectParcelNo: dto.subjectParcelNo || null,
      subjectLandShare: dto.subjectLandShare || null,
      subjectEnvironmentNotes: dto.subjectEnvironmentNotes || null,
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

  // --- Guven Skoru + Onerilen Deger Hesaplama ---
  // SADECE "includedInAnalysis=true" olan comps hesaba katilir -- danisman
  // bir comp'u "dahil etme" diye isaretlediyse (silmeden), hesaplamalarda
  // yer almamali. Duzeltme (adjustment) tutari uygulanmis fiyat kullanilir.
  private calculateConfidence(comps: ValuationComp[]): { level: ConfidenceLevel; score: number } {
    const included = comps.filter((c) => c.includedInAnalysis);
    const soldOrRented = included.filter((c) => c.compType === CompType.SOLD || c.compType === CompType.RENTED);
    // Puanlama: her dahil comp +15, sold/rented olanlar ekstra +10 (daha
    // guvenilir cunku kesin gerceklesmis fiyat, sadece istenen fiyat degil).
    let score = included.length * 15 + soldOrRented.length * 10;
    score = Math.min(100, score);
    const level: ConfidenceLevel = score >= 70 ? 'high' : score >= 35 ? 'medium' : 'low';
    return { level, score };
  }

  private calculateSuggestedValue(valuation: PropertyValuation, comps: ValuationComp[]): number | null {
    const included = comps.filter((c) => c.includedInAnalysis && c.areaM2);
    if (included.length === 0) return null;
    const pricePerM2Values = included.map((c) => {
      const adjusted = Number(c.price) + Number(c.adjustmentAmount || 0);
      return adjusted / Number(c.areaM2);
    });
    const avgPricePerM2 = pricePerM2Values.reduce((a, b) => a + b, 0) / pricePerM2Values.length;
    return Math.round(avgPricePerM2 * Number(valuation.subjectAreaM2));
  }

  async findOne(
    id: string,
    currentUser: CurrentUserPayload,
  ): Promise<{
    valuation: PropertyValuation;
    comps: ValuationComp[];
    confidence: { level: ConfidenceLevel; score: number };
    suggestedValue: number | null;
  }> {
    const valuation = await this.findOneOwned(id, currentUser);
    const comps = await this.compRepo.find({ where: { valuationId: id }, order: { createdAt: 'ASC' } });
    const confidence = this.calculateConfidence(comps);
    const suggestedValue = this.calculateSuggestedValue(valuation, comps);
    return { valuation, comps, confidence, suggestedValue };
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
  // karsilastirma cikmaz. TKGM/Sahibinden gibi disaridan otomatik veri
  // CEKILMIYOR (bkz. proje notlari) -- bu tur bilgiler danisman
  // tarafindan kendi arastirmasindan elle girilir.
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
        includedInAnalysis: true,
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
      includedInAnalysis: true,
      adjustmentAmount: dto.adjustmentAmount ?? 0,
      adjustmentReason: dto.adjustmentReason || null,
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

  // --- PDF Raporu (2 sayfa, profesyonel goruntu) ---
  // pdfkit ile sunucu tarafinda dogrudan olusturulur, disk'e yazmadan
  // bellekte bir Buffer olarak doner (controller bunu HTTP yaniti olarak
  // gonderir). NOT: pdfkit'te ".bold()" diye bir metod YOKTUR -- font
  // degistirmek icin HER ZAMAN ".font('Body-Bold')" / ".font('Body')"
  // kullanilir, aksi halde calisma zamaninda hata alinir.
  async generatePdf(id: string, currentUser: CurrentUserPayload): Promise<Buffer> {
    const { valuation, comps, confidence, suggestedValue } = await this.findOne(id, currentUser);
    const agent = await this.userRepo.findOne({ where: { id: valuation.agentId } });
    let subjectProperty: Property | null = null;
    if (valuation.propertyId) {
      subjectProperty = await this.propertyRepo.findOne({ where: { id: valuation.propertyId } });
    }

    // Mulk fotografini onceden indirmeyi dene (varsa) -- basarisiz olursa
    // PDF akisini bozmadan sessizce atlar.
    let photoBuffer: Buffer | null = null;
    const photoUrl = subjectProperty?.photoUrls?.[0];
    if (photoUrl) {
      try {
        const response = await fetch(photoUrl);
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          photoBuffer = Buffer.from(arrayBuffer);
        }
      } catch {
        // Fotograf cekilemedi -- rapor fotografsiz devam eder, kritik degil.
      }
    }

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 45, size: 'A4' });

      // Turkce karakterler (g, s, i, ö, ü, c ve buyuk/kucuk harfleri) icin
      // pdfkit'in yerlesik "Helvetica" fontlari YETERSIZ -- WinAnsi
      // kodlamasi bu karakterleri desteklemiyor, sonuc olarak metin
      // bozuk cikiyordu. Bunun yerine Turkce'yi tam destekleyen gercek
      // bir TrueType font (Roboto) gomulu olarak kullaniliyor.
      const fontsDir = path.join(__dirname, '../assets/fonts');
      doc.registerFont('Body', path.join(fontsDir, 'Roboto-Regular.ttf'));
      doc.registerFont('Body-Bold', path.join(fontsDir, 'Roboto-Bold.ttf'));
      doc.registerFont('Body-Italic', path.join(fontsDir, 'Roboto-Italic.ttf'));
      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const money = (n: number | null) => (n == null ? '—' : `${Math.round(Number(n)).toLocaleString('tr-TR')} ₺`);
      const confidenceLabel = { high: 'Yüksek', medium: 'Orta', low: 'Düşük' }[confidence.level];
      const confidenceColor = { high: '#1e7a3d', medium: '#8a6100', low: '#b3261e' }[confidence.level];
      const typeLabels: Record<string, string> = { sold: 'Satıldı', rented: 'Kiralandı', active_listing: 'Aktif İlan' };

      // ========== SAYFA 1: KAPAK + ÖZET ==========
      doc.fontSize(20).font('Body-Bold').text('Piyasa Değer Analizi', { align: 'center' });
      doc.fontSize(11).font('Body').fillColor('#666666').text('(Karşılaştırmalı Piyasa Analizi — KPA)', { align: 'center' });
      doc.fillColor('#000000');
      doc.moveDown(0.6);

      doc.fontSize(10).font('Body-Bold').text(`Hazırlayan: ${agent?.name || currentUser.name}`, { align: 'center' });
      if (agent?.phone) {
        doc.fontSize(9).font('Body').text(agent.phone, { align: 'center' });
      }
      doc.moveDown(0.8);

      if (photoBuffer) {
        try {
          const imgWidth = 280;
          const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
          doc.image(photoBuffer, doc.page.margins.left + (pageWidth - imgWidth) / 2, doc.y, { width: imgWidth });
          doc.moveDown(0.5);
        } catch {
          // Gomme basarisiz olsa bile akisi bozma.
        }
      }

      doc.moveDown(0.3);
      doc.fontSize(13).font('Body-Bold').text(valuation.subjectTitle);
      doc.fontSize(10).font('Body');
      doc.text(
        `${valuation.subjectProvince} / ${valuation.subjectDistrict}${valuation.subjectNeighborhood ? ' / ' + valuation.subjectNeighborhood : ''}`,
      );
      doc.text(
        `${valuation.subjectAreaM2} m²${valuation.subjectRooms ? '  ·  ' + valuation.subjectRooms : ''}${valuation.subjectBuildingAge != null ? '  ·  ' + valuation.subjectBuildingAge + ' yaşında' : ''}${valuation.subjectFloor ? '  ·  ' + valuation.subjectFloor : ''}`,
      );
      doc.moveDown(0.6);

      if (valuation.subjectParcelNo || valuation.subjectLandShare || valuation.subjectDeedType) {
        doc.fontSize(10).font('Body-Bold').text('Tapu Bilgileri');
        doc.font('Body').fontSize(9.5);
        if (valuation.subjectDeedType) doc.text(`Tapu Türü: ${valuation.subjectDeedType}`);
        if (valuation.subjectParcelNo) doc.text(`Ada/Parsel: ${valuation.subjectParcelNo}`);
        if (valuation.subjectLandShare) doc.text(`Arsa Payı: ${valuation.subjectLandShare}`);
        doc.moveDown(0.6);
      }

      doc.fontSize(12).font('Body-Bold').text('Fiyat Değerlendirmesi');
      doc.moveDown(0.2);
      const boxTop = doc.y;
      const boxWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
      const colWidth = boxWidth / 3;
      const labels = ['Hızlı Satış (Min)', 'Hedeflenen Fiyat', 'Üst Sınır (Max)'];
      const values = [valuation.estimatedValueMin, valuation.estimatedValueTarget, valuation.estimatedValueMax];
      const colColors = ['#eef3f9', '#f0f7f0', '#eef3f9'];
      for (let i = 0; i < 3; i++) {
        const x = doc.page.margins.left + i * colWidth;
        doc.rect(x, boxTop, colWidth - 6, 50).fill(colColors[i]);
        doc.fillColor('#333333').fontSize(8.5).font('Body').text(labels[i], x + 8, boxTop + 8, { width: colWidth - 20 });
        doc.fillColor('#111111').fontSize(11).font('Body-Bold').text(money(values[i] != null ? Number(values[i]) : null), x + 8, boxTop + 24, { width: colWidth - 20 });
      }
      doc.fillColor('#000000');
      doc.y = boxTop + 60;
      doc.moveDown(0.4);

      doc.fontSize(9).font('Body-Bold').fillColor(confidenceColor).text(`Güven Skoru: ${confidenceLabel} (${comps.filter((c) => c.includedInAnalysis).length} karşılaştırma baz alındı)`, { align: 'left' });
      doc.fillColor('#000000');
      if (suggestedValue) {
        doc.fontSize(8.5).font('Body-Italic').fillColor('#666666').text(`Sistem önerisi (m² ortalamasına göre): ${money(suggestedValue)} — sadece referans amaçlıdır`, { align: 'left' });
        doc.fillColor('#000000');
      }
      doc.moveDown(0.8);

      if (valuation.subjectEnvironmentNotes) {
        doc.fontSize(11).font('Body-Bold').text('Konum ve Çevre Değerlendirmesi');
        doc.moveDown(0.2);
        doc.fontSize(9.5).font('Body').text(valuation.subjectEnvironmentNotes);
        doc.moveDown(0.6);
      }

      if (valuation.subjectNotes) {
        doc.fontSize(11).font('Body-Bold').text('Mülk Notları');
        doc.moveDown(0.2);
        doc.fontSize(9.5).font('Body').text(valuation.subjectNotes);
      }

      // ========== SAYFA 2: KARŞILAŞTIRMA TABLOSU + SONUÇ ==========
      doc.addPage();
      doc.fontSize(14).font('Body-Bold').text('Karşılaştırma Tablosu (Comps)');
      doc.moveDown(0.4);

      const includedComps = comps.filter((c) => c.includedInAnalysis);
      const excludedComps = comps.filter((c) => !c.includedInAnalysis);

      if (includedComps.length === 0) {
        doc.fontSize(10).font('Body-Italic').text('Henüz karşılaştırma eklenmemiş.');
      } else {
        doc.fontSize(8.5).font('Body-Bold');
        doc.text('Başlık / Konum', 45, doc.y, { continued: true, width: 140 });
        doc.text('m²/Oda', 190, doc.y, { continued: true, width: 55 });
        doc.text('Fiyat', 250, doc.y, { continued: true, width: 70 });
        doc.text('m² Fiyatı', 325, doc.y, { continued: true, width: 65 });
        doc.text('Düzeltme', 395, doc.y, { continued: true, width: 65 });
        doc.text('Düzelt. Fiyat', 465, doc.y, { continued: true, width: 60 });
        doc.text('Durum', 530, doc.y, { width: 40 });
        doc.moveDown(0.2);
        doc.moveTo(45, doc.y).lineTo(565, doc.y).strokeColor('#cccccc').stroke();
        doc.moveDown(0.25);

        doc.font('Body').fontSize(8);
        includedComps.forEach((c) => {
          const startY = doc.y;
          const price = Number(c.price);
          const adjustment = Number(c.adjustmentAmount || 0);
          const adjustedPrice = price + adjustment;
          const pricePerM2 = c.areaM2 ? price / Number(c.areaM2) : null;

          doc.text(`${c.title}${c.district ? ' — ' + c.district : ''}`, 45, startY, { width: 140 });
          const afterTitleY = doc.y;
          doc.text(`${c.areaM2 || '—'}/${c.rooms || '—'}`, 190, startY, { width: 55 });
          doc.text(money(price), 250, startY, { width: 70 });
          doc.text(pricePerM2 ? money(pricePerM2) : '—', 325, startY, { width: 65 });
          doc.text(adjustment ? money(adjustment) : '—', 395, startY, { width: 65 });
          doc.font('Body-Bold').text(money(adjustedPrice), 465, startY, { width: 60 });
          doc.font('Body').text(typeLabels[c.compType] || c.compType, 530, startY, { width: 40 });
          doc.y = Math.max(afterTitleY, doc.y);
          if (c.adjustmentReason) {
            doc.fontSize(7).fillColor('#888888').text(`↳ ${c.adjustmentReason}`, 45, doc.y, { width: 500 });
            doc.fillColor('#000000').fontSize(8);
          }
          if (c.sourceNote) {
            doc.fontSize(7).fillColor('#aaaaaa').text(`Kaynak: ${c.sourceNote}`, 45, doc.y, { width: 500 });
            doc.fillColor('#000000').fontSize(8);
          }
          doc.moveDown(0.4);
        });
      }

      if (excludedComps.length > 0) {
        doc.moveDown(0.4);
        doc.fontSize(8.5).font('Body-Italic').fillColor('#999999').text(
          `Analiz dışı bırakılan ${excludedComps.length} karşılaştırma daha var (hesaba katılmadı): ${excludedComps.map((c) => c.title).join(', ')}`,
          { width: 500 },
        );
        doc.fillColor('#000000');
      }

      doc.moveDown(1);
      doc.fontSize(13).font('Body-Bold').text('Sonuç ve Gerekçe');
      doc.moveDown(0.3);
      if (valuation.conclusionNotes) {
        doc.fontSize(10).font('Body').text(valuation.conclusionNotes);
      } else {
        doc.fontSize(9.5).font('Body-Italic').fillColor('#999999').text('Danışman henüz bir sonuç notu eklememiş.');
        doc.fillColor('#000000');
      }

      doc.moveDown(2);
      const disclaimerY = doc.y;
      const disclaimerWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
      doc.rect(doc.page.margins.left, disclaimerY, disclaimerWidth, 46).fillAndStroke('#f8fafc', '#cbd5e1');
      doc.fillColor('#334155').fontSize(7.5).font('Body-Bold').text(
        'YASAL UYARI: Bu belge resmi bir SPK Gayrimenkul Değerleme Raporu değildir. Danışmanın piyasa gözlemine ve karşılaştırmalı verilere dayanan gayri resmi bir fiyat analizidir (Karşılaştırmalı Piyasa Analizi / KPA).',
        doc.page.margins.left + 10,
        disclaimerY + 8,
        { width: disclaimerWidth - 20, align: 'center' },
      );
      doc.fillColor('#000000');

      doc.moveDown(3);
      doc.fontSize(8).font('Body-Italic').fillColor('#999999').text(`Rapor tarihi: ${new Date().toLocaleDateString('tr-TR')}`, { align: 'center' });
      doc.fillColor('#000000');

      doc.end();
    });
  }
}
