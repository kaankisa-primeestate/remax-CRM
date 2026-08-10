import { useEffect, useState, useCallback } from 'react';
import { dashboardApi } from '../api/dashboard';

function toISO(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function rangeForPeriod(period) {
  const now = new Date();
  const to = toISO(now);
  const from = new Date(now);
  if (period === 'week') {
    from.setDate(from.getDate() - 7);
  } else if (period === 'month') {
    from.setMonth(from.getMonth() - 1);
  } else if (period === 'year') {
    from.setFullYear(from.getFullYear() - 1);
  }
  return { from: toISO(from), to };
}

const PERIOD_OPTIONS = [
  { value: 'week', label: 'Bu Hafta' },
  { value: 'month', label: 'Bu Ay' },
  { value: 'year', label: 'Bu Yıl' },
  { value: 'custom', label: 'Özel Aralık' },
];

const ACTIVITY_ICONS = {
  property: '🏠',
  customer: '👤',
  interaction: '📞',
  commission: '💰',
};

const money = (n) =>
  new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 0,
  }).format(n || 0);

const dateTime = (d) =>
  new Date(d).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

export default function DashboardPage() {
  const [period, setPeriod] = useState('week');
  const [customFrom, setCustomFrom] = useState(rangeForPeriod('week').from);
  const [customTo, setCustomTo] = useState(rangeForPeriod('week').to);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { from, to } = period === 'custom' ? { from: customFrom, to: customTo } : rangeForPeriod(period);
    const result = await dashboardApi.summary({ from, to });
    setData(result);
    setLoading(false);
  }, [period, customFrom, customTo]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <div className="folder-panel" style={{ marginBottom: 24 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', marginTop: 0 }}>Broker Dashboard</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: customFrom ? 12 : 0 }}>
          {PERIOD_OPTIONS.map((opt) => (
            <button key={opt.value} className={period === opt.value ? 'btn btn-primary' : 'btn btn-secondary'} onClick={() => setPeriod(opt.value)} style={{ fontSize: 13, padding: '6px 14px' }}>
              {opt.label}
            </button>
          ))}
        </div>
        {period === 'custom' && (
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div className="form-field" style={{ margin: 0 }}>
              <label>Başlangıç</label>
              <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
            </div>
            <div className="form-field" style={{ margin: 0 }}>
              <label>Bitiş</label>
              <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
            </div>
          </div>
        )}
      </div>

      {loading || !data ? (
        <div className="empty-state">Yükleniyor…</div>
      ) : (
        <>
          {data.badges.length > 0 && (
            <div className="folder-panel" style={{ marginBottom: 24 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', marginTop: 0 }}>Rozetler</h2>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {data.badges.map((b, i) => (
                  <div key={i} style={{ background: 'var(--paper-raised)', border: '1px solid var(--paper-line)', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 22 }}>{b.icon}</span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{b.agentName}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>{b.label}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="folder-panel" style={{ marginBottom: 24 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', marginTop: 0 }}>Sıralama</h2>
            {data.leaderboard.length === 0 ? (
              <div className="empty-state">Bu aralıkta veri yok.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase' }}>
                    <th style={{ padding: '6px 8px' }}>#</th>
                    <th style={{ padding: '6px 8px' }}>Danışman</th>
                    <th style={{ padding: '6px 8px' }}>Portföy</th>
                    <th style={{ padding: '6px 8px' }}>Müşteri</th>
                    <th style={{ padding: '6px 8px' }}>Görüşme</th>
                    <th style={{ padding: '6px 8px' }}>Komisyon</th>
                    <th style={{ padding: '6px 8px' }}>Satış Tutarı</th>
                  </tr>
                </thead>
                <tbody>
                  {data.leaderboard.map((row, i) => (
                    <tr key={row.agentId} style={{ borderTop: '1px solid var(--paper-line)' }}>
                      <td style={{ padding: '10px 8px', fontWeight: 700 }}>{i + 1}</td>
                      <td style={{ padding: '10px 8px' }}>{row.agentName}</td>
                      <td style={{ padding: '10px 8px' }}>{row.propertiesCount}</td>
                      <td style={{ padding: '10px 8px' }}>{row.customersCount}</td>
                      <td style={{ padding: '10px 8px' }}>{row.interactionsCount}</td>
                      <td style={{ padding: '10px 8px' }}>{row.commissionsCount}</td>
                      <td style={{ padding: '10px 8px', fontFamily: 'var(--font-mono)' }}>{money(row.salesValue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="folder-panel">
            <h2 style={{ fontFamily: 'var(--font-display)', marginTop: 0 }}>Canlı Aktivite</h2>
            {data.activity.length === 0 ? (
              <div className="empty-state">Bu aralıkta aktivite yok.</div>
            ) : (
              data.activity.map((item, i) => (
                <div className="record-row" key={i}>
                  <span style={{ marginRight: 10 }}>{ACTIVITY_ICONS[item.type] || '•'}</span>
                  <span className="record-row__name" style={{ flex: 1 }}>
                    {item.agentName} — {item.title}
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--muted)' }}>
                    {dateTime(item.occurredAt)}
                  </span>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
