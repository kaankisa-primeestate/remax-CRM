import { useEffect, useState, useCallback } from 'react';
import { cashFlowApi } from '../../api/cashFlow';
import { formatMoney } from '../../api/bankAccounts';

const SOURCE_ICONS = {
  cheque_note: '📑',
  commission_in: '💰',
  commission_out: '💰',
  agent_due: '👤',
  recurring_expense: '🔁',
};

export default function CashFlowTab() {
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await cashFlowApi.getForecast();
      setForecast(data);
    } catch {
      setForecast(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return <div className="empty-state">Yükleniyor…</div>;
  }
  if (!forecast) {
    return <div className="empty-state">Projeksiyon şu an alınamadı, tekrar deneyin.</div>;
  }

  const isPositive = forecast.netProjection >= 0;

  return (
    <>
      <div className="folder-panel" style={{ marginBottom: 20 }}>
        <h3 style={{ fontFamily: 'var(--font-display)', marginTop: 0, fontSize: 16 }}>
          Önümüzdeki {forecast.periodDays} Gün ({new Date(forecast.fromDate).toLocaleDateString('tr-TR')} — {new Date(forecast.toDate).toLocaleDateString('tr-TR')})
        </h3>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 14 }}>
          <div style={{ flex: 1, minWidth: 160, padding: '14px 16px', background: '#e6f4ea', borderRadius: 8 }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>Tahmini Girdi</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#1e7a3d' }}>{formatMoney(forecast.totalInflow)}</div>
          </div>
          <div style={{ flex: 1, minWidth: 160, padding: '14px 16px', background: '#fbeeeb', borderRadius: 8 }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>Tahmini Çıktı</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--danger)' }}>{formatMoney(forecast.totalOutflow)}</div>
          </div>
          <div style={{ flex: 1, minWidth: 160, padding: '14px 16px', background: isPositive ? '#eef3f9' : '#fdf3e0', borderRadius: 8 }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>Net Projeksiyon</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: isPositive ? 'var(--ink-navy)' : '#8a6100' }}>
              {isPositive ? '+' : ''}{formatMoney(forecast.netProjection)}
            </div>
          </div>
        </div>

        <details style={{ marginTop: 14 }}>
          <summary style={{ cursor: 'pointer', fontSize: 12, color: 'var(--muted)' }}>Bu projeksiyon nasıl hesaplanıyor? (varsayımlar)</summary>
          <ul style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8, paddingLeft: 18 }}>
            {forecast.assumptions.map((a, i) => (
              <li key={i} style={{ marginBottom: 4 }}>{a}</li>
            ))}
          </ul>
        </details>
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <div className="folder-panel" style={{ flex: 1, minWidth: 320 }}>
          <h4 style={{ fontFamily: 'var(--font-display)', marginTop: 0, fontSize: 14, color: '#1e7a3d' }}>↑ Tahmini Girdiler</h4>
          {forecast.inflows.length === 0 ? (
            <div className="empty-state">Bu dönemde beklenen bir girdi yok.</div>
          ) : (
            forecast.inflows.map((item, i) => (
              <div key={i} className="ledger-history-item">
                <span style={{ fontSize: 14 }}>{SOURCE_ICONS[item.source]}</span>
                <span style={{ flex: 1 }}>{item.label}</span>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>{new Date(item.date).toLocaleDateString('tr-TR')}</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--success)' }}>+{formatMoney(item.amount)}</span>
              </div>
            ))
          )}
        </div>

        <div className="folder-panel" style={{ flex: 1, minWidth: 320 }}>
          <h4 style={{ fontFamily: 'var(--font-display)', marginTop: 0, fontSize: 14, color: 'var(--danger)' }}>↓ Tahmini Çıktılar</h4>
          {forecast.outflows.length === 0 ? (
            <div className="empty-state">Bu dönemde beklenen bir çıktı yok.</div>
          ) : (
            forecast.outflows.map((item, i) => (
              <div key={i} className="ledger-history-item">
                <span style={{ fontSize: 14 }}>{SOURCE_ICONS[item.source]}</span>
                <span style={{ flex: 1 }}>{item.label}</span>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>{new Date(item.date).toLocaleDateString('tr-TR')}</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--danger)' }}>−{formatMoney(item.amount)}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
