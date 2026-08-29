import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { dashboardApi } from '../api/dashboard';
import { propertiesApi } from '../api/properties';
import { propertyCommentsApi } from '../api/propertyComments';
import { transactionsApi } from '../api/transactions';
import TradingViewWidget from '../components/TradingViewWidget.jsx';

const TICKER_CONFIG = {
  symbols: [
    { proName: 'FX_IDC:USDTRY', title: 'USD/TRY' },
    { proName: 'FX_IDC:EURTRY', title: 'EUR/TRY' },
    { proName: 'TVC:GOLD', title: 'Altın' },
    { proName: 'BIST:XU100', title: 'BIST 100' },
  ],
  showSymbolLogo: true,
  isTransparent: true,
  displayMode: 'adaptive',
  colorTheme: 'light',
  locale: 'tr',
};

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

// Ilan onay akisi artik GERCEK veri (property.status = pending_approval/
// needs_revision) ile besleniyor -- bkz. asagidaki data.pendingApprovals.

function RevenueTrendChart({ months }) {
  const maxValue = Math.max(1, ...months.map((m) => m.total));
  const hasAnyData = months.some((m) => m.total > 0);

  if (!hasAnyData) {
    return (
      <div className="panel__empty">
        Henüz komisyon kaydı yok. İlk kayıtlar girildikçe bu grafik otomatik dolacak.
      </div>
    );
  }

  return (
    <div className="revenue-chart">
      {months.map((m) => {
        const heightPct = Math.max(4, Math.round((m.total / maxValue) * 100));
        return (
          <div className="revenue-chart__col" key={m.key}>
            <div className="revenue-chart__bar-track">
              <div
                className="revenue-chart__bar"
                style={{ height: `${heightPct}%` }}
                title={money(m.total)}
              />
            </div>
            <div className="revenue-chart__value">{m.total > 0 ? formatMoneyShort(m.total) : '—'}</div>
            <div className="revenue-chart__label">{m.label}</div>
          </div>
        );
      })}
    </div>
  );
}

function formatMoneyShort(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(n);
}

export default function DashboardPage() {
  const [period, setPeriod] = useState('month');
  const [customFrom, setCustomFrom] = useState(rangeForPeriod('month').from);
  const [customTo, setCustomTo] = useState(rangeForPeriod('month').to);
  const [data, setData] = useState(null);
  const [propertyStats, setPropertyStats] = useState(null);
  const [agentActivity, setAgentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { from, to } = period === 'custom' ? { from: customFrom, to: customTo } : rangeForPeriod(period);
      const [summary, properties, activity] = await Promise.all([
        dashboardApi.summary({ from, to }),
        propertiesApi.list({}),
        dashboardApi.agentActivity().catch(() => []),
      ]);
      setData(summary);
      setAgentActivity(activity);
      const active = properties.filter((p) => p.status === 'active');
      setPropertyStats({
        total: properties.length,
        activeSale: active.filter((p) => p.listingType === 'sale').length,
        activeRent: active.filter((p) => p.listingType === 'rent').length,
      });
    } finally {
      setLoading(false);
    }
  }, [period, customFrom, customTo]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleApprove(propertyId) {
    try {
      await propertiesApi.update(propertyId, { status: 'active' });
      load();
    } catch (err) {
      const message = err?.response?.data?.message ?? 'Onaylanamadı.';
      alert(Array.isArray(message) ? message.join(', ') : message);
    }
  }

  async function handleRequestRevision(propertyId) {
    const note = window.prompt('Danışmana iletilecek revizyon notu (örn: "Fiyatı kontrol et", "Fotoğraf eksik"):');
    if (note === null) return; // vazgecildi
    try {
      await propertiesApi.update(propertyId, { status: 'needs_revision', revisionNote: note || undefined });
      if (note && note.trim()) {
        // Ayni notu yazisma thread'ine de ekliyoruz -- boylece Danisman
        // konuyu tam olarak orada gorup cevap yazabilir.
        await propertyCommentsApi.create(propertyId, note.trim()).catch(() => {});
      }
      load();
    } catch (err) {
      const message = err?.response?.data?.message ?? 'Revizyon isteği gönderilemedi.';
      alert(Array.isArray(message) ? message.join(', ') : message);
    }
  }

  async function handleResolveFlag(noteId) {
    try {
      await transactionsApi.resolveNoteFlag(noteId);
      load();
    } catch {
      alert('İşaretlenemedi, tekrar deneyin.');
    }
  }

  const periodLabel = PERIOD_OPTIONS.find((p) => p.value === period)?.label || '';
  const totalRevenue = data ? data.leaderboard.reduce((sum, r) => sum + r.salesValue, 0) : 0;
  const topAgent = data?.leaderboard?.[0];

  return (
    <div>
      <div className="market-ticker">
        <TradingViewWidget
          scriptSrc="https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js"
          config={TICKER_CONFIG}
          height={46}
        />
        <Link to="/piyasa" className="market-ticker__link">Tüm Piyasa Verilerini Gör →</Link>
      </div>

      <div className="folder-panel" style={{ marginBottom: 20 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', marginTop: 0 }}>Genel Bakış</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: period === 'custom' ? 12 : 0 }}>
          {PERIOD_OPTIONS.map((opt) => (
            <button key={opt.value} className={period === opt.value ? 'btn btn-primary' : 'btn btn-secondary'} onClick={() => setPeriod(opt.value)} style={{ fontSize: 13, padding: '6px 14px' }}>
              {opt.label}
            </button>
          ))}
        </div>
        {period === 'custom' && (
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
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

      {loading || !data || !propertyStats ? (
        <div className="empty-state">Yükleniyor…</div>
      ) : (
        <>
          {/* --- Metrik Kartları --- */}
          <div className="metric-grid">
            <div className="metric-card">
              <div className="metric-card__label">Toplam Portföy</div>
              <div className="metric-card__value">{propertyStats.total} İlan</div>
              <div className="metric-card__delta is-muted">Tüm zamanlar</div>
            </div>
            <div className="metric-card">
              <div className="metric-card__label">Toplam Ciro ({periodLabel})</div>
              <div className="metric-card__value">{money(totalRevenue)}</div>
              <div className="metric-card__delta is-muted">{data.leaderboard.length} danışman katkısı</div>
            </div>
            <div className="metric-card">
              <div className="metric-card__label">Aktif Satış / Kira</div>
              <div className="metric-card__value">{propertyStats.activeSale + propertyStats.activeRent} İşlem</div>
              <div className="metric-card__delta is-muted">{propertyStats.activeSale} Satılık / {propertyStats.activeRent} Kiralık</div>
            </div>
            <div className="metric-card">
              <div className="metric-card__label">Danışman Performansı</div>
              <div className="metric-card__value" style={{ fontSize: 16 }}>{topAgent ? topAgent.agentName : '—'}</div>
              <div className="metric-card__delta is-up">{topAgent ? `Lider · ${money(topAgent.salesValue)}` : 'Veri yok'}</div>
            </div>
          </div>

          {/* --- Ciro Grafiği + Akıllı Aksiyon Merkezi --- */}
          <div className="panel-grid-2">
            <div className="panel">
              <h3 className="panel__title">Ofis Ciro Grafiği (Son 6 Ay)</h3>
              <RevenueTrendChart months={data.revenueTrend || []} />
            </div>
            <div className="panel">
              <h3 className="panel__title">Akıllı Aksiyon & Onay Merkezi</h3>
              {(data.pendingApprovals || []).map((p) => {
                if (p.kind === 'flag') {
                  return (
                    <div className="action-item" key={`flag-${p.noteId}`}>
                      <span className="action-item__dot">⚠️</span>
                      <div className="action-item__body">
                        <div className="action-item__title">Danışman Bildirimi: {p.title}</div>
                        <div className="action-item__meta">{p.agentName} · {p.text}</div>
                        <div className="action-item__buttons">
                          <button type="button" className="btn btn-primary" onClick={() => handleResolveFlag(p.noteId)}>
                            ✓ Çözüldü
                          </button>
                          <Link to={`/islemler/${p.transactionId}`} className="btn btn-secondary" style={{ textDecoration: 'none' }}>
                            İşlem Dosyasını Aç
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                }
                if (p.kind === 'deal') {
                  return (
                    <div className="action-item" key={`deal-${p.transactionId}`}>
                      <span className="action-item__dot">🔴</span>
                      <div className="action-item__body">
                        <div className="action-item__title">Kapanış Onayı Bekliyor: {p.title}</div>
                        <div className="action-item__meta">
                          {p.agentName}
                          {p.totalCommission ? ` · Komisyon: ${money(p.totalCommission)}` : ''}
                        </div>
                        <div className="action-item__buttons">
                          <Link to={`/islemler/${p.transactionId}?tab=financial`} className="btn btn-primary" style={{ textDecoration: 'none' }}>
                            İşlem Dosyasını Aç ve Onayla
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                }
                if (p.kind === 'split') {
                  return (
                    <div className="action-item" key={`split-${p.transactionId}`}>
                      <span className="action-item__dot">🤝</span>
                      <div className="action-item__body">
                        <div className="action-item__title">İşbirlikli Paylaşım Onayı Bekliyor: {p.title}</div>
                        <div className="action-item__meta">{p.agentName}</div>
                        <div className="action-item__buttons">
                          <Link to={`/islemler/${p.transactionId}`} className="btn btn-secondary" style={{ textDecoration: 'none' }}>
                            İşlem Dosyasını Aç
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                }
                if (p.kind === 'overdue_due') {
                  return (
                    <Link to="/finans" className="action-item action-item--clickable" key={`due-${p.dueId}`}>
                      <span className="action-item__dot">🔴</span>
                      <div className="action-item__body">
                        <div className="action-item__title">{p.title}</div>
                        <div className="action-item__meta">
                          {p.agentName} · {money(p.amount)} · Aidatlar sekmesinden işaretleyin →
                        </div>
                      </div>
                    </Link>
                  );
                }
                // kind === 'property' (varsayilan, mevcut davranis)
                return (
                  <div className="action-item" key={`property-${p.propertyId}`}>
                    <span className="action-item__dot">{p.status === 'needs_revision' ? '🟠' : '🔴'}</span>
                    <div className="action-item__body">
                      <div className="action-item__title">
                        {p.status === 'needs_revision' ? 'Revizyon Bekliyor' : 'Onay Bekleyen İlan'}: {p.title}
                      </div>
                      <div className="action-item__meta">
                        {p.agentName}
                        {p.status === 'needs_revision' && p.revisionNote && (
                          <> · Not: "{p.revisionNote}"</>
                        )}
                      </div>
                      <div className="action-item__buttons">
                        <button type="button" className="btn btn-primary" onClick={() => handleApprove(p.propertyId)}>
                          Onayla
                        </button>
                        <button type="button" className="btn btn-secondary" onClick={() => handleRequestRevision(p.propertyId)}>
                          Revize İste
                        </button>
                        <Link to={`/portfoyler/${p.propertyId}`} className="btn btn-secondary" style={{ textDecoration: 'none' }}>
                          Detay
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
              {(data.expiringContracts || []).map((c) => (
                <Link to={`/portfoyler/${c.propertyId}`} className="action-item action-item--clickable" key={c.propertyId}>
                  <span className="action-item__dot">🟡</span>
                  <div className="action-item__body">
                    <div className="action-item__title">Sözleşme Bitimi: {c.title}</div>
                    <div className="action-item__meta">
                      {c.agentName} · {c.daysLeft <= 0 ? 'Bugün' : `${c.daysLeft} gün kaldı`} ({new Date(c.contractEndDate).toLocaleDateString('tr-TR')}) · Güncellemek için tıklayın →
                    </div>
                  </div>
                </Link>
              ))}
              {(data.pendingApprovals || []).length === 0 && (data.expiringContracts || []).length === 0 && (
                <div className="panel__empty">Aksiyon bekleyen bir öğe yok.</div>
              )}
            </div>
          </div>

          {/* --- Danışman Aktiviteleri: aksiyon gerektirmez, sadece haberdar-olma amacli --- */}
          <div className="panel" style={{ marginBottom: 20 }}>
            <h3 className="panel__title">Danışman Aktiviteleri</h3>
            {agentActivity.length === 0 ? (
              <div className="panel__empty">Yakın zamanda bir aktivite yok.</div>
            ) : (
              agentActivity.map((a, i) => (
                <Link to={`/islemler/${a.transactionId}`} className="record-row" key={i} style={{ textDecoration: 'none' }}>
                  <span style={{ marginRight: 10 }}>📋</span>
                  <span className="record-row__name" style={{ flex: 1 }}>
                    {a.agentName} — {a.title}: {a.text}
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--muted)' }}>
                    {dateTime(a.createdAt)}
                  </span>
                </Link>
              ))
            )}
          </div>

          {/* --- Rozetler (gercek veri) --- */}
          {data.badges.length > 0 && (
            <div className="folder-panel" style={{ marginBottom: 20 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', marginTop: 0, fontSize: 16 }}>Rozetler</h2>
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

          {/* --- Danışman Liderlik Tablosu (gercek veri) --- */}
          <div className="panel" style={{ marginBottom: 20 }}>
            <h3 className="panel__title">Danışman Liderlik Tablosu</h3>
            {data.leaderboard.length === 0 ? (
              <div className="panel__empty">Bu aralıkta veri yok.</div>
            ) : (
              <div className="table-scroll">
                <table style={{ width: '100%', minWidth: 560, borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ textAlign: 'left', color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase' }}>
                      <th style={{ padding: '6px 8px', whiteSpace: 'nowrap' }}>#</th>
                      <th style={{ padding: '6px 8px', whiteSpace: 'nowrap' }}>Danışman</th>
                      <th style={{ padding: '6px 8px', whiteSpace: 'nowrap' }}>Portföy</th>
                      <th style={{ padding: '6px 8px', whiteSpace: 'nowrap' }}>Müşteri</th>
                      <th style={{ padding: '6px 8px', whiteSpace: 'nowrap' }}>Görüşme</th>
                      <th style={{ padding: '6px 8px', whiteSpace: 'nowrap' }}>Komisyon</th>
                      <th style={{ padding: '6px 8px', whiteSpace: 'nowrap' }}>Satış Tutarı</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.leaderboard.map((row, i) => (
                      <tr key={row.agentId} style={{ borderTop: '1px solid var(--paper-line)' }}>
                        <td style={{ padding: '10px 8px', fontWeight: 700 }}>{i + 1}</td>
                        <td style={{ padding: '10px 8px', whiteSpace: 'nowrap' }}>{row.agentName}</td>
                        <td style={{ padding: '10px 8px' }}>{row.propertiesCount}</td>
                        <td style={{ padding: '10px 8px' }}>{row.customersCount}</td>
                        <td style={{ padding: '10px 8px' }}>{row.interactionsCount}</td>
                        <td style={{ padding: '10px 8px' }}>{row.commissionsCount}</td>
                        <td style={{ padding: '10px 8px', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>{money(row.salesValue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* --- Canlı Aktivite (gercek veri) --- */}
          <div className="panel">
            <h3 className="panel__title">Canlı Aktivite</h3>
            {data.activity.length === 0 ? (
              <div className="panel__empty">Bu aralıkta aktivite yok.</div>
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
