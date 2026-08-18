import { Injectable, Logger } from '@nestjs/common';
// NOT: rss-parser paketi TypeScript'in standart "default export" sozdizimini
// desteklemiyor (paket dogrudan CommonJS ile module.exports = Parser
// seklinde disari aciliyor, .default diye bir alani yok). Bu yuzden
// `import Parser from 'rss-parser'` derleme zamaninda calisir gorunse de
// CALISMA ZAMANINDA "Parser.default is not a constructor" hatasi verir --
// dogru sozdizimi asagidaki TypeScript'e ozel import-equals biçimidir.
import Parser = require('rss-parser');

export interface RealEstateNewsItem {
  title: string;
  link: string;
  source: string;
  publishedAt: string | null;
}

// Guvenilir Turk ekonomi/haber kaynaklarinin RSS beslemeleri. Genel ekonomi
// akislari kullanildi (saf "emlak" RSS'i cok az kaynakta guvenilir/surekli
// var) -- asagidaki anahtar kelime filtresiyle emlak/konut/faiz/enflasyon
// konulu haberler ayiklanip one cikariliyor.
//
// ONEMLI NOT: Bu adresler yaygin bilinen/genel kullanilan RSS yollaridir.
// Haber sitelerinin RSS URL'leri zaman zaman degisebiliyor -- deploy
// sonrasi hangi kaynaklarin gercekten veri dondurdugunu kontrol etmek
// gerekir (bkz. /api/market/real-estate-news yanit icindeki "source" alani,
// hic gelmeyen bir kaynak varsa URL'sinin guncellenmesi gerekebilir).
const FEEDS: { name: string; url: string }[] = [
  { name: 'AA Ekonomi', url: 'https://www.aa.com.tr/tr/rss/default?cat=ekonomi' },
  { name: 'Dünya Gazetesi', url: 'https://www.dunya.com/rss?dunya' },
  { name: 'Sabah Ekonomi', url: 'https://www.sabah.com.tr/rss/ekonomi.xml' },
  { name: 'Hürriyet Ekonomi', url: 'https://www.hurriyet.com.tr/rss/ekonomi' },
  { name: 'Emlakkulisi', url: 'https://www.emlakkulisi.com/rss' },
];

// Baslik/ozet icinde bu kelimelerden en az biri gecmeyen haberler
// akistan eleniyor -- amac "emlak agirlikli" bir akis olusturmak.
const KEYWORDS = [
  'emlak', 'konut', 'kira', 'kiralık', 'gayrimenkul', 'tapu', 'ipotek',
  'faiz', 'enflasyon', 'tüfe', 'üfe', 'tüik', 'mortgage', 'inşaat',
  'daire', 'villa', 'arsa', 'imar', 'kentsel dönüşüm', 'konut kredisi',
  'konut satış', 'konut satışı',
];

function normalizeForSearch(text: string): string {
  return (text || '')
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i');
}

function matchesKeyword(title: string, summary: string): boolean {
  const haystack = normalizeForSearch(`${title} ${summary || ''}`);
  return KEYWORDS.some((kw) => haystack.includes(normalizeForSearch(kw)));
}

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 dakika -- her sayfa acilisinda tum
// kaynaklari tekrar cekmemek icin basit bellek-ici onbellek.

@Injectable()
export class MarketNewsService {
  private readonly logger = new Logger(MarketNewsService.name);
  private readonly parser = new Parser({ timeout: 8000 });
  private cache: { data: RealEstateNewsItem[]; fetchedAt: number } | null = null;

  async getRealEstateNews(): Promise<RealEstateNewsItem[]> {
    if (this.cache && Date.now() - this.cache.fetchedAt < CACHE_TTL_MS) {
      return this.cache.data;
    }

    const results = await Promise.allSettled(
      FEEDS.map((feed) => this.fetchFeed(feed.name, feed.url)),
    );

    const items: RealEstateNewsItem[] = [];
    results.forEach((result, i) => {
      if (result.status === 'fulfilled') {
        items.push(...result.value);
      } else {
        // Bir kaynak basarisiz olursa tum akisi dusurmuyoruz, sadece
        // logluyoruz -- diger kaynaklardan gelen haberler gosterilmeye devam eder.
        this.logger.warn(`RSS kaynağı alınamadı: ${FEEDS[i].name} — ${result.reason}`);
      }
    });

    // Aym linke sahip yinelenenleri temizle, tarihe gore (en yeni once) sirala
    const seen = new Set<string>();
    const deduped = items.filter((item) => {
      if (seen.has(item.link)) return false;
      seen.add(item.link);
      return true;
    });
    deduped.sort((a, b) => {
      const dateA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
      const dateB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
      return dateB - dateA;
    });

    const final = deduped.slice(0, 40); // en fazla 40 haber
    this.cache = { data: final, fetchedAt: Date.now() };
    return final;
  }

  private async fetchFeed(sourceName: string, url: string): Promise<RealEstateNewsItem[]> {
    const feed = await this.parser.parseURL(url);
    return (feed.items || [])
      .filter((item) => matchesKeyword(item.title || '', item.contentSnippet || item.content || ''))
      .map((item) => ({
        title: (item.title || '').trim(),
        link: item.link || '',
        source: sourceName,
        publishedAt: item.isoDate || item.pubDate || null,
      }))
      .filter((item) => item.title && item.link);
  }
}
