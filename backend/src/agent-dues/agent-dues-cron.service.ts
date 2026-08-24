import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { AgentDuesService } from './agent-dues.service';

// Her ayin 1'i, sabah 06:00'da o ayin aidatlarini OTOMATIK olarak
// olusturur -- Broker'in artik elle "Bu ayin aidatlarini olustur"
// butonuna basmasina gerek kalmaz. generateForMonthInternal zaten
// idempotent oldugu icin, ayni ay icin sunucu yeniden baslasa/cron iki
// kez tetiklense bile SORUN OLMAZ -- var olan kayitlar tekrar
// olusturulmaz.
@Injectable()
export class AgentDuesCronService {
  private readonly logger = new Logger(AgentDuesCronService.name);

  constructor(private readonly agentDuesService: AgentDuesService) {}

  @Cron('0 6 1 * *')
  async handleMonthlyDuesGeneration() {
    const now = new Date();
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    try {
      const result = await this.agentDuesService.generateForMonthInternal(period);
      this.logger.log(`Aylık aidat otomasyonu (${period}): ${result.created} oluşturuldu, ${result.skipped} atlandı.`);
    } catch (err) {
      this.logger.error(`Aylık aidat otomasyonu başarısız (${period}): ${err}`);
    }
  }
}
