import { useNavigate } from 'react-router-dom';
import TradingViewWidget from '../components/TradingViewWidget.jsx';

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

const ECONOMIC_CALENDAR_CONFIG = {
  colorTheme: 'light',
  isTransparent: true,
  width: '100%',
  height: '480',
  locale: 'tr',
  importanceFilter: '0,1',
  countryFilter: 'tr,us,eu',
};

// Piyasa: Dolar/Euro/Altin/BIST canli verileri + faiz karari/enflasyon
// gibi onemli ekonomi haberlerinin takvimi. Tamami TradingView'in
// ucretsiz embed widget'lari ile calisir -- API anahtari, backend
// maliyeti veya bakim gerektirmez, her zaman guncel.
export default function MarketPage() {
  const navigate = useNavigate();

  return (
    <div>
      <button
        type="button"
        onClick={() => navigate(-1)}
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
          color: 'var(--muted)',
          background: 'transparent',
          border: 'none',
          padding: 0,
          marginBottom: 12,
          cursor: 'pointer',
          display: 'block',
        }}
      >
        ← Geri Dön
      </button>
      <h2 className="dossier__name" style={{ marginBottom: 16 }}>💹 Piyasa</h2>

      <div className="panel" style={{ marginBottom: 20 }}>
        <h3 className="panel__title">Döviz, Altın & Borsa</h3>
        <TradingViewWidget
          scriptSrc="https://s3.tradingview.com/external-embedding/embed-widget-market-overview.js"
          config={MARKET_OVERVIEW_CONFIG}
          height={480}
        />
      </div>

      <div className="panel">
        <h3 className="panel__title">Ekonomi Takvimi (Faiz Kararları, Enflasyon vb.)</h3>
        <TradingViewWidget
          scriptSrc="https://s3.tradingview.com/external-embedding/embed-widget-events.js"
          config={ECONOMIC_CALENDAR_CONFIG}
          height={480}
        />
      </div>
    </div>
  );
}
