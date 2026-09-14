import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LineChart, Newspaper, ChevronRight, AlertTriangle } from 'lucide-react';
import { EmptyState, TableSkeleton } from '../components/Feedback';
import { PanelHead } from '../components/PanelHead';
import TradingViewWidget from '../components/TradingViewWidget.jsx';
import { marketApi } from '../api/market';

const MARKET_OVERVIEW_CONFIG = {
  colorTheme: 'light',
  dateRange: '12M',
  showChart: true,
  locale: 'tr',
  isTransparent: true,
  showSymbolLogo: true,
  showFloatingTooltip: false,
  width: '100%',
  height: '480',
  plotLineColorGrowing: 'rgba(41, 98, 255, 1)',
  plotLineColorFalling: 'rgba(41, 98, 255, 1)',
  gridLineColor: 'rgba(240, 243, 250, 0)',
  scaleFontColor: 'rgba(19, 23, 34, 1)',
  belowLineFillColorGrowing: 'rgba(41, 98, 255, 0.12)',
  belowLineFillColorFalling: 'rgba(41, 98, 255, 0.12)',
  belowLineFillColorGrowingBottom: 'rgba(41, 98, 255, 0)',
  belowLineFillColorFallingBottom: 'rgba(41, 98, 255, 0)',
  symbolActiveColor: 'rgba(41, 98, 255, 0.12)',
  tabs: [
    {
      title: 'Döviz',
      symbols: [
        { s: 'FX_IDC:USDTRY', d: 'USD/TRY' },
        { s: 'FX_IDC:EURTRY', d: 'EUR/TRY' },
        { s: 'FX_IDC:GBPTRY', d: 'GBP/TRY' },
      ],
    },
    {
      title: 'Emtia',
      symbols: [
        { s: 'TVC:GOLD', d: 'Altın (Ons)' },
        { s: 'TVC:SILVER', d: 'Gümüş' },
        { s: 'TVC:USOIL', d: 'Petrol' },
      ],
    },
    {
      title: 'Borsa',
      symbols: [
        { s: 'BIST:XU100', d: 'BIST 100' },
      ],
    },
  ],
};

// Ekonomi takvimi -- Turkiye odakli olsun diye SADECE 'tr' ile filtrelendi
// (daha once tr,us,eu birlikteydi, yurtdisi agirlikli gorunuyordu).
const ECONOMIC_CALENDAR_CONFIG = {
  colorTheme: 'light',
  isTransparent: true,
  width: '100%',
  height: '420',
  locale: 'tr',
  importanceFilter: '0,1',
  countryFilter: 'tr',
};

function formatRelativeDate(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '';
  const diffMs = Date.now() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 1) return 'az önce';
  if (diffHours < 24) return `${diffHours} saat önce`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} gün önce`;
  return date.toLocaleDateString('tr-TR');
}

// Piyasa: ASIL ODAK -- emlak/ekonomi haber akisi (enflasyon, konut
// kredisi faizleri, kira artis oranlari, TUIK konut satis verileri gibi
// konularda guncel haberler, birkac guvenilir kaynaktan otomatik cekilip
// filtreleniyor). Altta, ikincil olarak Dolar/Euro/Altin/BIST canli
// verileri + Turkiye odakli ekonomi takvimi (TradingView ucretsiz embed).
export default function MarketPage() {
  const [news, setNews] = useState([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [newsError, setNewsError] = useState(false);

  useEffect(() => {
    marketApi
      .getRealEstateNews()
      .then((data) => setNews(data))
      .catch(() => setNewsError(true))
      .finally(() => setNewsLoading(false));
  }, []);

  return (
    <div>
      <div className="cl-page-header">
        <div className="cl-page-header__text">
          <nav className="cl-breadcrumb" aria-label="Sayfa yolu">
            <Link to="/">Ana Sayfa</Link>
            <ChevronRight size={14} strokeWidth={2} aria-hidden="true" />
            <span aria-current="page">Piyasa</span>
          </nav>
          <h2 className="cl-page-title">Piyasa</h2>
          <p className="cl-page-subtitle">
            Emlak ve ekonomi haberleri, döviz/altın/borsa verileri ve ekonomi takvimi.
          </p>
        </div>
      </div>
      <div className="panel" style={{ marginBottom: 20 }}>
        <PanelHead
          Icon={Newspaper}
          title="Emlak & Ekonomi Haberleri"
          note="Enflasyon, konut kredisi faizleri, kira artış oranları ve TÜİK konut satış verileri — birkaç güvenilir kaynaktan otomatik derlenir."
        />
        {newsLoading ? (
          <TableSkeleton rows={4} columns={1} label="Haberler yükleniyor…" />
        ) : newsError ? (
          <EmptyState
            Icon={AlertTriangle}
            title="Haberler şu an alınamadı"
            note="Kaynaklara ulaşılamadı; birazdan tekrar deneyin."
          />
        ) : news.length === 0 ? (
          <EmptyState
            Icon={Newspaper}
            title="Şu an gösterilecek haber bulunamadı"
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {news.map((item, i) => (
              <a
                key={item.link || i}
                href={item.link}
                target="_blank"
                rel="noreferrer"
                className="record-row"
                style={{ textDecoration: 'none', color: 'inherit', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}
              >
                <span className="record-row__name" style={{ fontSize: 14 }}>{item.title}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--cl-muted)' }}>{item.source}</span>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--cl-muted)' }}>{formatRelativeDate(item.publishedAt)}</span>
                </span>
              </a>
            ))}
          </div>
        )}
      </div>

      <div className="panel" style={{ marginBottom: 20 }}>
        <PanelHead Icon={LineChart} title="Döviz, Altın & Borsa" />
        <TradingViewWidget
          scriptSrc="https://s3.tradingview.com/external-embedding/embed-widget-market-overview.js"
          config={MARKET_OVERVIEW_CONFIG}
          height={480}
        />
      </div>

      <div className="panel">
        <PanelHead Icon={LineChart} title="Ekonomi Takvimi (Türkiye)" />
        <TradingViewWidget
          scriptSrc="https://s3.tradingview.com/external-embedding/embed-widget-events.js"
          config={ECONOMIC_CALENDAR_CONFIG}
          height={420}
        />
      </div>
    </div>
  );
}
