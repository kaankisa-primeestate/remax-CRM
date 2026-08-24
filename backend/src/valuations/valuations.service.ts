import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeepPartial } from 'typeorm';
import * as path from 'path';
import PDFDocument = require('pdfkit');
import { PropertyValuation, ValuationStatus } from './valuation.entity';
import { ValuationComp } from './valuation-comp.entity';
import { CreateValuationDto } from './dto/create-valuation.dto';
import { UpdateValuationDto } from './dto/update-valuation.dto';
import { AddCompDto } from './dto/add-comp.dto';
import { UpdateCompDto } from './dto/update-comp.dto';
import { Property } from '../portfolios/property.entity';
import { User } from '../users/user.entity';
import { CurrentUserPayload } from '../auth/current-user.decorator';

const GROUP_LABELS: Record<string, string> = {
  residential: 'Konut',
  commercial: 'Ticari / Gelir Getiren',
  land: 'Arazi',
  mixed: 'Karma (Bina)',
};

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  apartment: 'Daire',
  land: 'Arsa',
  field: 'Tarla',
  commercial: 'İşyeri',
  timeshare: 'Devre Mülk',
  villa: 'Villa',
  office: 'Plaza / Ofis',
  building: 'Komple Bina',
  project: 'Yeni Konut Projesi',
  hotel: 'Otel / Turizm Tesisi',
};

@Injectable()
export class ValuationsService {
  constructor(
    @InjectRepository(PropertyValuation) private readonly valuationRepo: Repository<PropertyValuation>,
    @InjectRepository(ValuationComp) private readonly compRepo: Repository<ValuationComp>,
    @InjectRepository(Property) private readonly propertyRepo: Repository<Property>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

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

  async findOne(id: string, currentUser: CurrentUserPayload): Promise<{ valuation: PropertyValuation; comps: ValuationComp[] }> {
    const valuation = await this.findOneOwned(id, currentUser);
    const comps = await this.compRepo.find({ where: { valuationId: id }, order: { createdAt: 'ASC' } });
    return { valuation, comps };
  }

  // "Mevcut Portfoyden Sec" akisi -- secilen portfoyun mevcut bilgilerini
  // otomatik dolduracak bir taslak dondurur, henuz kaydetmez.
  async prefillFromProperty(propertyId: string, currentUser: CurrentUserPayload): Promise<Partial<CreateValuationDto>> {
    const property = await this.propertyRepo.findOne({ where: { id: propertyId } });
    if (!property) {
      throw new NotFoundException('Portföy bulunamadı');
    }
    const groupByType: Record<string, string> = {
      apartment: 'residential',
      villa: 'residential',
      timeshare: 'residential',
      project: 'residential',
      commercial: 'commercial',
      office: 'commercial',
      hotel: 'commercial',
      land: 'land',
      field: 'land',
      building: 'mixed',
    };
    return {
      propertyId: property.id,
      propertyGroup: (groupByType[property.propertyType] || 'residential') as any,
      propertyType: property.propertyType,
      subjectTitle: property.title,
      subjectProvince: property.province,
      subjectDistrict: property.district,
      subjectNeighborhood: property.neighborhood || undefined,
      subjectAreaM2: Number(property.areaM2 || 0),
      subjectDeedType: property.deedStatus || undefined,
      groupData: {
        rooms: property.rooms || undefined,
        buildingAge: property.buildingAge || undefined,
        floor: property.floor || undefined,
        heatingType: property.heatingType || undefined,
        view: property.view || undefined,
        hasParking: property.hasParking || undefined,
      },
    };
  }

  async create(dto: CreateValuationDto, currentUser: CurrentUserPayload): Promise<PropertyValuation> {
    const valuation = this.valuationRepo.create({
      ...(dto as any),
      agentId: currentUser.userId,
      status: ValuationStatus.DRAFT,
    } as DeepPartial<PropertyValuation>);
    return this.valuationRepo.save(valuation);
  }

  async update(id: string, dto: UpdateValuationDto, currentUser: CurrentUserPayload): Promise<PropertyValuation> {
    const valuation = await this.findOneOwned(id, currentUser);
    Object.assign(valuation, dto);
    return this.valuationRepo.save(valuation);
  }

  async remove(id: string, currentUser: CurrentUserPayload): Promise<void> {
    const valuation = await this.findOneOwned(id, currentUser);
    await this.valuationRepo.remove(valuation);
  }

  async addComp(valuationId: string, dto: AddCompDto, currentUser: CurrentUserPayload): Promise<ValuationComp> {
    await this.findOneOwned(valuationId, currentUser);
    const comp = this.compRepo.create({
      ...(dto as any),
      valuationId,
      addedByName: currentUser.name,
    } as DeepPartial<ValuationComp>);
    return this.compRepo.save(comp);
  }

  async updateComp(compId: string, dto: UpdateCompDto, currentUser: CurrentUserPayload): Promise<ValuationComp> {
    const comp = await this.compRepo.findOne({ where: { id: compId } });
    if (!comp) {
      throw new NotFoundException('Emsal bulunamadı');
    }
    await this.findOneOwned(comp.valuationId, currentUser);
    Object.assign(comp, dto);
    return this.compRepo.save(comp);
  }

  async removeComp(compId: string, currentUser: CurrentUserPayload): Promise<void> {
    const comp = await this.compRepo.findOne({ where: { id: compId } });
    if (!comp) {
      throw new NotFoundException('Emsal bulunamadı');
    }
    await this.findOneOwned(comp.valuationId, currentUser);
    await this.compRepo.remove(comp);
  }

  // --- PDF Raporu ---
  // Once kullanilan pdfkit + gomulu Roboto font deseni (Turkce karakter
  // destegi icin) -- diger raporlarla AYNI kalite/kurulum.
  async generatePdf(id: string, currentUser: CurrentUserPayload): Promise<Buffer> {
    const { valuation, comps } = await this.findOne(id, currentUser);
    const agent = await this.userRepo.findOne({ where: { id: valuation.agentId } });
    const includedComps = comps.filter((c) => c.includedInAnalysis);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 45, size: 'A4' });
      const fontsDir = path.join(__dirname, '../assets/fonts');
      doc.registerFont('Body', path.join(fontsDir, 'Roboto-Regular.ttf'));
      doc.registerFont('Body-Bold', path.join(fontsDir, 'Roboto-Bold.ttf'));
      doc.registerFont('Body-Italic', path.join(fontsDir, 'Roboto-Italic.ttf'));
      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const money = (n: number | null) => (n != null ? `${Math.round(Number(n)).toLocaleString('tr-TR')} ₺` : '—');
      const groupLabel = GROUP_LABELS[valuation.propertyGroup] || valuation.propertyGroup;
      const typeLabel = PROPERTY_TYPE_LABELS[valuation.propertyType] || valuation.propertyType;
      const gd: Record<string, any> = valuation.groupData || {};

      // ========== KURUMSAL BASLIK ==========
      doc.fontSize(22).font('Body-Bold').fillColor('#1F3A5F').text('RE/MAX Bostancı', { align: 'center' });
      doc.fontSize(11).font('Body').fillColor('#666666').text('Piyasa Değer Analizi Raporu', { align: 'center' });
      doc.fillColor('#000000');
      doc.moveDown(0.3);
      doc.moveTo(45, doc.y).lineTo(550, doc.y).strokeColor('#1F3A5F').lineWidth(1.5).stroke();
      doc.moveDown(0.6);

      // ========== DANISMAN BILGISI ==========
      doc.fontSize(9).font('Body-Bold').text('Hazırlayan Danışman: ', { continued: true }).font('Body').text(agent?.name || 'Danışman');
      if (agent?.phone) doc.font('Body-Bold').text('İletişim: ', { continued: true }).font('Body').text(agent.phone);
      if (agent?.email) doc.font('Body-Bold').text('E-posta: ', { continued: true }).font('Body').text(agent.email);
      doc.font('Body-Bold').text('Rapor Tarihi: ', { continued: true }).font('Body').text(new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }));
      doc.moveDown(0.8);

      // ========== HUKUKI UYARI ==========
      doc.fontSize(7.5).font('Body-Italic').fillColor('#888888').text(
        'Bu rapor, SPK lisanslı bir Gayrimenkul Değerleme Uzmanı tarafından düzenlenen resmi "Gayrimenkul Değerleme Raporu" değildir. Danışmanın piyasa gözlemine ve karşılaştırmalı verilere dayanan gayri resmi bir fiyat analizidir.',
        { align: 'justify' },
      );
      doc.fillColor('#000000');
      doc.moveDown(0.8);

      // ========== MULK OZETI ==========
      doc.fontSize(13).font('Body-Bold').text(`${valuation.subjectTitle}`);
      doc.fontSize(9.5).font('Body').fillColor('#444444').text(
        `${typeLabel} (${groupLabel}) · ${valuation.subjectDistrict}, ${valuation.subjectProvince}` +
          (valuation.subjectNeighborhood ? ` — ${valuation.subjectNeighborhood}` : '') +
          (valuation.subjectAddressDetail ? ` — ${valuation.subjectAddressDetail}` : ''),
      );
      doc.fillColor('#000000');
      doc.moveDown(0.4);

      doc.fontSize(9.5).font('Body-Bold').text('Alan: ', { continued: true }).font('Body').text(`${valuation.subjectAreaM2} m²`);

      if (valuation.propertyGroup === 'residential' || valuation.propertyGroup === 'mixed') {
        if (gd.rooms) doc.font('Body-Bold').text('Oda Sayısı: ', { continued: true }).font('Body').text(String(gd.rooms));
        if (gd.buildingAge != null) doc.font('Body-Bold').text('Bina Yaşı: ', { continued: true }).font('Body').text(String(gd.buildingAge));
        if (gd.floor) doc.font('Body-Bold').text('Bulunduğu Kat: ', { continued: true }).font('Body').text(String(gd.floor));
        if (gd.heatingType) doc.font('Body-Bold').text('Isıtma: ', { continued: true }).font('Body').text(String(gd.heatingType));
      }
      if (valuation.propertyGroup === 'commercial' || valuation.propertyGroup === 'mixed') {
        if (gd.monthlyRent) doc.font('Body-Bold').text('Aylık Kira Geliri: ', { continued: true }).font('Body').text(money(gd.monthlyRent));
        if (gd.occupancyRate != null) doc.font('Body-Bold').text('Doluluk Oranı: ', { continued: true }).font('Body').text(`%${gd.occupancyRate}`);
        if (gd.capRate != null) doc.font('Body-Bold').text('Kapitalizasyon Oranı: ', { continued: true }).font('Body').text(`%${gd.capRate}`);
      }
      if (valuation.propertyGroup === 'land') {
        if (gd.zoningStatus) doc.font('Body-Bold').text('İmar Durumu: ', { continued: true }).font('Body').text(String(gd.zoningStatus));
        if (gd.kaks) doc.font('Body-Bold').text('KAKS (Emsal): ', { continued: true }).font('Body').text(String(gd.kaks));
        if (gd.roadFrontage != null) doc.font('Body-Bold').text('Yola Cephe: ', { continued: true }).font('Body').text(gd.roadFrontage ? 'Var' : 'Yok');
        if (gd.irrigationStatus) doc.font('Body-Bold').text('Sulama Durumu: ', { continued: true }).font('Body').text(String(gd.irrigationStatus));
      }
      if (valuation.subjectParcelNo) doc.font('Body-Bold').text('Ada/Parsel: ', { continued: true }).font('Body').text(valuation.subjectParcelNo);
      if (valuation.subjectDeedType) doc.font('Body-Bold').text('Tapu Türü: ', { continued: true }).font('Body').text(valuation.subjectDeedType);
      doc.moveDown(0.6);

      if (valuation.subjectEnvironmentNotes) {
        doc.fontSize(9.5).font('Body-Bold').text('Konum ve Çevre Notları:');
        doc.font('Body').text(valuation.subjectEnvironmentNotes, { align: 'justify' });
        doc.moveDown(0.6);
      }

      // ========== EMSAL KARSILASTIRMA TABLOSU ==========
      doc.fontSize(12).font('Body-Bold').text(valuation.propertyGroup === 'commercial' ? 'Emsal Kira / Gelir Karşılaştırması' : 'Emsal Karşılaştırma Tablosu');
      doc.moveDown(0.3);
      if (includedComps.length === 0) {
        doc.fontSize(9.5).font('Body-Italic').fillColor('#666666').text('Bu analize henüz emsal eklenmedi.');
        doc.fillColor('#000000');
      } else {
        const isCommercial = valuation.propertyGroup === 'commercial';
        const colX = { title: 45, area: 230, metric: 300, price: 400 };
        doc.fontSize(8).font('Body-Bold').fillColor('#666666');
        const y0 = doc.y;
        doc.text('EMSAL', colX.title, y0, { width: 180 });
        doc.text('ALAN', colX.area, y0, { width: 65 });
        doc.text(isCommercial ? 'CAP ORANI' : 'ODA', colX.metric, y0, { width: 95 });
        doc.text(isCommercial ? 'AYLIK KİRA' : 'FİYAT', colX.price, y0, { width: 110, align: 'right' });
        doc.fillColor('#000000');
        doc.moveDown(0.4);
        doc.moveTo(45, doc.y).lineTo(550, doc.y).strokeColor('#cccccc').stroke();
        doc.moveDown(0.3);

        includedComps.forEach((c) => {
          if (doc.y > 740) doc.addPage();
          const y = doc.y;
          doc.fontSize(8.5).font('Body');
          doc.text(c.title, colX.title, y, { width: 180 });
          doc.text(c.areaM2 ? `${c.areaM2} m²` : '—', colX.area, y, { width: 65 });
          doc.text(isCommercial ? (c.capRate != null ? `%${c.capRate}` : '—') : c.rooms || '—', colX.metric, y, { width: 95 });
          doc.font('Body-Bold').text(isCommercial ? money(c.monthlyRent) : money(c.price), colX.price, y, { width: 110, align: 'right' });
          doc.font('Body');
          doc.moveDown(0.5);
        });

        doc.moveDown(0.3);
        doc.moveTo(45, doc.y).lineTo(550, doc.y).strokeColor('#cccccc').stroke();
        doc.moveDown(0.3);
        if (!isCommercial) {
          const withPrice = includedComps.filter((c) => c.price && c.areaM2);
          if (withPrice.length > 0) {
            const avgUnit = withPrice.reduce((sum, c) => sum + Number(c.price) / Number(c.areaM2), 0) / withPrice.length;
            doc.fontSize(9).font('Body-Bold').text(`Ortalama m² Birim Fiyatı: ${money(avgUnit)}/m²`);
          }
        } else {
          const withCap = includedComps.filter((c) => c.capRate);
          if (withCap.length > 0) {
            const avgCap = withCap.reduce((sum, c) => sum + Number(c.capRate), 0) / withCap.length;
            doc.fontSize(9).font('Body-Bold').text(`Ortalama Kapitalizasyon Oranı: %${avgCap.toFixed(1)}`);
          }
        }
      }
      doc.moveDown(0.8);

      // ========== SWOT ==========
      if (valuation.swotStrengths || valuation.swotWeaknesses || valuation.swotOpportunities || valuation.swotThreats) {
        doc.fontSize(12).font('Body-Bold').text('SWOT Analizi');
        doc.moveDown(0.3);
        const swotRows: [string, string | null][] = [
          ['Güçlü Yönler', valuation.swotStrengths],
          ['Zayıf Yönler', valuation.swotWeaknesses],
          ['Fırsatlar', valuation.swotOpportunities],
          ['Tehditler / Riskler', valuation.swotThreats],
        ];
        swotRows.forEach(([label, text]) => {
          if (!text) return;
          doc.fontSize(9).font('Body-Bold').text(`${label}: `, { continued: true }).font('Body').text(text);
          doc.moveDown(0.2);
        });
        doc.moveDown(0.6);
      }

      // ========== SONUC VE FIYAT TAVSIYESI ==========
      doc.fontSize(12).font('Body-Bold').text('Sonuç ve Fiyat Tavsiyesi');
      doc.moveDown(0.4);
      const priceBoxY = doc.y;
      const boxW = 160;
      const priceBoxes = [
        { label: 'Hızlı Satış Taban Fiyatı', value: valuation.estimatedValueMin, color: '#8a6100' },
        { label: 'Hedeflenen Gerçekçi Fiyat', value: valuation.estimatedValueTarget, color: '#1e7a3d' },
        { label: 'Pazarlık Paylı Açılış Fiyatı', value: valuation.estimatedValueMax, color: '#1f3a5f' },
      ];
      priceBoxes.forEach((b, i) => {
        const x = 45 + i * (boxW + 8);
        doc.rect(x, priceBoxY, boxW, 50).fillAndStroke('#f7f5ee', '#e3dfd2');
        doc.fontSize(7.5).font('Body').fillColor('#666666').text(b.label.toUpperCase(), x + 8, priceBoxY + 8, { width: boxW - 16 });
        doc.fontSize(11).font('Body-Bold').fillColor(b.color).text(money(b.value), x + 8, priceBoxY + 24, { width: boxW - 16 });
      });
      doc.fillColor('#000000');
      doc.y = priceBoxY + 62;
      doc.moveDown(0.5);

      if (valuation.conclusionNotes) {
        doc.fontSize(9.5).font('Body-Bold').text('Danışman Notu / Strateji:');
        doc.font('Body').text(valuation.conclusionNotes, { align: 'justify' });
      }

      doc.fontSize(7).font('Body-Italic').fillColor('#999999');
      doc.text(
        'Bu analiz, danışmanın profesyonel gözlemine ve piyasa verilerine dayanır; resmi bir ekspertiz raporu yerine geçmez.',
        45,
        780,
        { width: 510, align: 'center' },
      );

      doc.end();
    });
  }
}
