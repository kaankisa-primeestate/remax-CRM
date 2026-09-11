import { useEffect, useState, useCallback } from 'react';
import { FileStack, Wallet, User, Repeat, ArrowUp, ArrowDown } from 'lucide-react';
import { cashFlowApi } from '../../api/cashFlow';
import { formatMoney } from '../../api/bankAccounts';

const SOURCE_ICONS = {
  cheque_note: FileStack,
  commission_in: Wallet,
  commission_out: Wallet,
  agent_due: User,
  recurring_expense: Repeat,
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
        <h3 style={{ fontFamily: 'var(--cl-font-heading)', marginTop: 0, fontSize: 16 }}>
          Önümüzdeki {forecast.periodDays} Gün ({new Date(forecast.fromDate).toLocaleDateString('tr-TR')} — {new Date(forecast.toDate).toLocaleDateString('tr-TR')})
        </h3>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 14 }}>
          <div style={{ flex: 1, minWidth: 160, padding: '14px 16px', background: 'rgba(21, 154, 99, 0.08)', borderRadius: 10 }}>
            <div style={{ fontSize: 11, color: 'var(--cl-muted)', fontFamily: 'var(--font-body)', fontWeight: 600, textTransform: 'uppercase' }}>Tahmini Girdi</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--cl-success)' }}>{formatMoney(forecast.totalInflow)}</div>
          </div>
          <div style={{ flex: 1, minWidth: 160, padding: '14px 16px', background: 'rgba(214, 69, 69, 0.06)', borderRadius: 10 }}>
            <div style={{ fontSize: 11, color: 'var(--cl-muted)', fontFamily: 'var(--font-body)', fontWeight: 600, textTransform: 'uppercase' }}>Tahmini Çıktı</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--cl-danger)' }}>{formatMoney(forecast.totalOutflow)}</div>
          </div>
          <div style={{ flex: 1, minWidth: 160, padding: '14px 16px', background: isPositive ? 'rgba(16, 35, 61, 0.06)' : 'rgba(196, 154, 85, 0.12)', borderRadius: 10 }}>
            <div style={{ fontSize: 11, color: 'var(--cl-muted)', fontFamily: 'var(--font-body)', fontWeight: 600, textTransform: 'uppercase' }}>Net Projeksiyon</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: isPositive ? 'var(--cl-primary-800)' : '#8a6420' }}>
              {isPositive ? '+' : ''}{formatMoney(forecast.netProjection)}
            </div>
          </div>
        </div>

        <details style={{ marginTop: 14 }}>
          <summary style={{ cursor: 'pointer', fontSize: 12, color: 'var(--cl-muted)' }}>Bu projeksiyon nasıl hesaplanıyor? (varsayımlar)</summary>
          <ul style={{ fontSize: 12, color: 'var(--cl-muted)', marginTop: 8, paddingLeft: 18 }}>
            {forecast.assumptions.map((a, i) => (
              <li key={i} style={{ marginBottom: 4 }}>{a}</li>
            ))}
          </ul>
        </details>
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <div className="folder-panel" style={{ flex: 1, minWidth: 320 }}>
          <h4 style={{ fontFamily: 'var(--cl-font-heading)', marginTop: 0, fontSize: 14, color: 'var(--cl-success)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <ArrowUp size={14} /> Tahmini Girdiler
          </h4>
          {forecast.inflows.length === 0 ? (
            <div className="empty-state">Bu dönemde beklenen bir girdi yok.</div>
          ) : (
            forecast.inflows.map((item, i) => {
              const SourceIcon = SOURCE_ICONS[item.source] || Wallet;
              return (
              <div key={i} className="ledger-history-item">
                <SourceIcon size={13} style={{ color: 'var(--cl-muted)' }} />
                <span style={{ flex: 1 }}>{item.label}</span>
                <span style={{ fontSize: 12, color: 'var(--cl-muted)' }}>{new Date(item.date).toLocaleDateString('tr-TR')}</span>
                <span style={{ fontFamily: 'var(--font-body)', color: 'var(--cl-success)' }}>+{formatMoney(item.amount)}</span>
              </div>
              );
            })
          )}
        </div>

        <div className="folder-panel" style={{ flex: 1, minWidth: 320 }}>
          <h4 style={{ fontFamily: 'var(--cl-font-heading)', marginTop: 0, fontSize: 14, color: 'var(--cl-danger)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <ArrowDown size={14} /> Tahmini Çıktılar
          </h4>
          {forecast.outflows.length === 0 ? (
            <div className="empty-state">Bu dönemde beklenen bir çıktı yok.</div>
          ) : (
            forecast.outflows.map((item, i) => {
              const SourceIcon = SOURCE_ICONS[item.source] || Wallet;
              return (
              <div key={i} className="ledger-history-item">
                <SourceIcon size={13} style={{ color: 'var(--cl-muted)' }} />
                <span style={{ flex: 1 }}>{item.label}</span>
                <span style={{ fontSize: 12, color: 'var(--cl-muted)' }}>{new Date(item.date).toLocaleDateString('tr-TR')}</span>
                <span style={{ fontFamily: 'var(--font-body)', color: 'var(--cl-danger)' }}>−{formatMoney(item.amount)}</span>
              </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
