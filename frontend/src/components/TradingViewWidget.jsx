import { useEffect, useRef } from 'react';

// TradingView'in ucretsiz, API anahtari gerektirmeyen embed widget'larini
// (Ticker Tape, Market Overview, Economic Calendar vb.) React icinde
// kullanmak icin genel amacli bir sarmalayici. TradingView'in kendi ornek
// kodlarindaki gibi, bir <script> etiketine JSON config yazip container'a
// ekliyoruz -- script disaridan TradingView'in kendi sunucusundan geliyor.
export default function TradingViewWidget({ scriptSrc, config, height = 400 }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    // Yeniden mount olursa (orn. React StrictMode) eski widget'i temizle
    containerRef.current.innerHTML = '<div class="tradingview-widget-container__widget"></div>';

    const script = document.createElement('script');
    script.src = scriptSrc;
    script.async = true;
    script.type = 'text/javascript';
    script.innerHTML = JSON.stringify(config);
    containerRef.current.appendChild(script);
  }, [scriptSrc, JSON.stringify(config)]);

  return (
    <div className="tradingview-widget-container" ref={containerRef} style={{ height, width: '100%' }} />
  );
}
