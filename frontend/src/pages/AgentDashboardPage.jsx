import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { propertiesApi } from '../api/properties';
import { customersApi } from '../api/customers';
import { dashboardApi } from '../api/dashboard';
import { tasksApi } from '../api/tasks';
import { appointmentsApi, APPOINTMENT_TYPES } from '../api/appointments';
import { announcementsApi } from '../api/announcements';
import { transactionsApi, TRANSACTION_STAGES } from '../api/transactions';
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

const money = (n) =>
  new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(n || 0);

const MATCHABLE_TYPES = ['buyer', 'tenant', 'investor'];
const MAX_CUSTOMERS_TO_SCAN = 8; // performans icin taranacak musteri sayisi ust siniri
const MAX_MATCHES_SHOWN = 4;

export default function AgentDashboardPage() {
  const { user } = useAuth();
  const firstName = user?.name?.split(' ')[0] || '';

  const [loading, setLoading] = useState(true);
  const [activePropertiesCount, setActivePropertiesCount] = useState(0);
  const [matches, setMatches] = useState([]);
  const [myTarget, setMyTarget] = useState(null);
  const [todayTasks, setTodayTasks] = useState([]);
  const [todayAppointments, setTodayAppointments] = useState([]);
  const [needsRevisionProperties, setNeedsRevisionProperties] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [officeModalOpen, setOfficeModalOpen] = useState(false);
  const [hotOpportunitiesCount, setHotOpportunitiesCount] = useState(0);
  const [weeklyShowingsCount, setWeeklyShowingsCount] = useState(0);
  const [weeklyLeaderboard, setWeeklyLeaderboard] = useState([]);
  const [monthlyLeaderboard, setMonthlyLeaderboard] = useState([]);
  const [leaderboardPeriod, setLeaderboardPeriod] = useState('week');
  const [myTransactions, setMyTransactions] = useState([]);
  const [allPropertiesForLookup, setAllPropertiesForLookup] = useState([]);
  const [allCustomersForLookup, setAllCustomersForLookup] = useState([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const [properties, customers, targetProgress, tasks, appointments, revisionProperties, announcementList, transactions, allProperties] = await Promise.all([
        propertiesApi.list({ status: 'active' }),
        customersApi.list({}),
        dashboardApi.myTarget().catch(() => null),
        tasksApi.list().catch(() => []),
        appointmentsApi.list().catch(() => []),
        propertiesApi.list({ status: 'needs_revision' }).catch(() => []),
        announcementsApi.list().catch(() => []),
        transactionsApi.list().catch(() => []),
        propertiesApi.list({}).catch(() => []), // Kanban'da tum durumlardaki portfoyleri eslestirmek icin (sadece aktif degil)
      ]);
      if (cancelled) return;
      setActivePropertiesCount(properties.length);
      setMyTarget(targetProgress);
      setAnnouncements(announcementList.slice(0, 20));
      setNeedsRevisionProperties(revisionProperties);
      setMyTransactions(transactions);
      setAllPropertiesForLookup(allProperties);
      setAllCustomersForLookup(customers);

      // Bugunun Is Plani: gecikmis (dueDate < bugun) veya bugune ait
      // (dueDate === bugun), henuz tamamlanmamis gorevler.
      const todayStr = new Date().toISOString().slice(0, 10);
      const relevant = tasks
        .filter((t) => !t.completed && t.dueDate && t.dueDate <= todayStr)
        .sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1));
      setTodayTasks(relevant);

      // Bugunun randevulari (tamamlanmamis, sadece bugune ait, saate gore sirali)
      const todaysAppts = appointments
        .filter((a) => !a.completed && a.date === todayStr)
        .sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'));
      setTodayAppointments(todaysAppts);

      // Sicak Firsatlar: "Ne zaman?" sorusuna "Hemen" diyen Alici/Kiraci/
      // Yatirimci musteri sayisi -- yapay zeka puanlamasi gerektirmez,
      // musterinin kendi beyaniyla zaten "sicak" oldugu belli.
      const hotCount = customers.filter(
        (c) => MATCHABLE_TYPES.includes(c.type) && c.purchaseTimeline === 'immediate',
      ).length;
      setHotOpportunitiesCount(hotCount);

      // Bu Haftaki Gosterim: bu takvim haftasina (Pazartesi-Pazar) denk
      // gelen "Ilan Gosterimi" turundeki randevu sayisi.
      const now = new Date();
      const dayOfWeek = (now.getDay() + 6) % 7; // Pazartesi=0 olacak sekilde kaydiriyoruz
      const monday = new Date(now);
      monday.setDate(now.getDate() - dayOfWeek);
      monday.setHours(0, 0, 0, 0);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      const mondayStr = monday.toISOString().slice(0, 10);
      const sundayStr = sunday.toISOString().slice(0, 10);
      const weeklyShowings = appointments.filter(
        (a) => a.type === 'showing' && a.date >= mondayStr && a.date <= sundayStr,
      ).length;
      setWeeklyShowingsCount(weeklyShowings);

      // Akilli Eslestirme: kendi musterilerinden (alici/kiraci/yatirimci)
      // birkacini tarayip en iyi eslesen portfoyleri topluyoruz. Bu, zaten
      // var olan eslestirme motorunu (matching.service.ts) kullanir --
      // yeni bir backend ozelligi degildir.
      const candidates = customers
        .filter((c) => MATCHABLE_TYPES.includes(c.type))
        .slice(0, MAX_CUSTOMERS_TO_SCAN);

      const results = await Promise.all(
        candidates.map(async (c) => {
          try {
            const found = await customersApi.matchingProperties(c.id);
            if (!found || found.length === 0) return null;
            return { customer: c, ...found[0] };
          } catch {
            return null;
          }
        }),
      );
      if (cancelled) return;
      const topMatches = results
        .filter(Boolean)
        .sort((a, b) => b.score - a.score)
        .slice(0, MAX_MATCHES_SHOWN);
      setMatches(topMatches);
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // Liderlik Tablosu -- Broker Dashboard'daki ile ayni veri, gamification
  // amacli tum ofis gorebiliyor. Ayri, bagimsiz bir yukleme (ana veri
  // akisina dokunmadan).
  useEffect(() => {
    dashboardApi.leaderboard('week').then(setWeeklyLeaderboard).catch(() => setWeeklyLeaderboard([]));
    dashboardApi.leaderboard('month').then(setMonthlyLeaderboard).catch(() => setMonthlyLeaderboard([]));
  }, []);

  async function handleRespondAnnouncement(announcementId, status) {
    // Iyimser guncelleme -- butona basar basmaz UI'da yaniti goster
    setAnnouncements((prev) =>
      prev.map((a) => (a.id === announcementId ? { ...a, myResponse: { status } } : a)),
    );
    try {
      await announcementsApi.respond(announcementId, { status });
    } catch (err) {
      alert('Yanıt gönderilemedi, tekrar deneyin.');
    }
  }

  // Duyuruyu "Sil" -- SADECE bu danismanin ekranindan kaldirir (kalici
  // silme degil, Broker/diger danismanlar etkilenmez -- bkz. backend).
  async function handleDismissAnnouncement(announcementId) {
    const previous = announcements;
    setAnnouncements((prev) => prev.filter((a) => a.id !== announcementId));
    try {
      await announcementsApi.dismiss(announcementId);
    } catch {
      alert('Duyuru kaldırılamadı, tekrar deneyin.');
      setAnnouncements(previous);
    }
  }

  return (
    <div>
      <h2 className="dossier__name" style={{ marginBottom: 4 }}>
        Merhaba{firstName ? `, ${firstName}` : ''} 👋
      </h2>
      <p style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 13, marginBottom: 12 }}>
        {new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
      </p>

      <div className="market-ticker">
        <TradingViewWidget
          scriptSrc="https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js"
          config={TICKER_CONFIG}
          height={46}
        />
        <Link to="/piyasa" className="market-ticker__link">Tüm Piyasa Verilerini Gör →</Link>
      </div>

      {announcements.length > 0 && (() => {
        const pendingCount = announcements.filter((a) => a.type === 'meeting' && !a.myResponse).length;
        const hasCelebration = announcements.some((a) => a.type === 'celebration');
        return (
          <button
            type="button"
            className={`office-trigger${hasCelebration ? ' office-trigger--celebration' : ''}`}
            onClick={() => {
              setOfficeModalOpen(true);
              // Modal acilinca gorunen tum duyurular "okundu" sayilir --
              // zaten icerikleri direkt burada tam gorunuyor, ayrica
              // tiklamaya gerek yok (bkz. bildirim zilindeki ayni mantik).
              announcements.forEach((a) => {
                if (!a.isRead) announcementsApi.markRead(a.id).catch(() => {});
              });
            }}
          >
            <span className="office-trigger__icon">🏢</span>
            <span className="office-trigger__label">Merkez Ofis</span>
            <span className="office-trigger__hint">
              {hasCelebration ? '🎉 Yeni kutlama mesajı var!' : `${announcements.length} duyuru`}
            </span>
            {pendingCount > 0 && <span className="office-trigger__badge">{pendingCount}</span>}
          </button>
        );
      })()}

      {officeModalOpen && (
        <div className="modal-backdrop" onClick={() => setOfficeModalOpen(false)}>
          <div className="modal office-modal" onClick={(e) => e.stopPropagation()}>
            <div className="office-modal__header">
              <h2 style={{ margin: 0 }}>🏢 Merkez Ofis</h2>
              <button type="button" className="office-modal__close" onClick={() => setOfficeModalOpen(false)}>✕</button>
            </div>
            <div className="office-modal__scroll">
              {announcements.map((a) => (
                <div key={a.id} className={`announcement-feed__item${a.type === 'celebration' ? ' announcement-feed__item--celebration' : ''}`}>
                  {a.type === 'celebration' && (
                    <div className="confetti">
                      <span>🎉</span><span>🎊</span><span>✨</span><span>🎉</span><span>🎊</span>
                    </div>
                  )}
                  <div className="announcement-feed__item-title">{a.type === 'celebration' ? '🎉 ' : ''}{a.title}</div>
                  <div className="announcement-feed__item-message">{a.message}</div>
                  <div className="announcement-feed__item-date">{new Date(a.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</div>
                  {a.type === 'meeting' && (
                    <div className="announcement-feed__response">
                      {a.myResponse ? (
                        <span className={`announcement-feed__response-badge announcement-feed__response-badge--${a.myResponse.status}`}>
                          {a.myResponse.status === 'yes' ? '✓ Katılacağım olarak yanıtladınız' : '✕ Katılamayacağım olarak yanıtladınız'}
                        </span>
                      ) : (
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button type="button" className="btn btn-primary" style={{ fontSize: 12, padding: '5px 12px' }} onClick={() => handleRespondAnnouncement(a.id, 'yes')}>
                            ✓ Katılacağım
                          </button>
                          <button type="button" className="btn btn-secondary" style={{ fontSize: 12, padding: '5px 12px' }} onClick={() => handleRespondAnnouncement(a.id, 'no')}>
                            ✕ Katılamayacağım
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ fontSize: 11, padding: '4px 10px', marginTop: 10, color: 'var(--danger)' }}
                    onClick={() => handleDismissAnnouncement(a.id)}
                  >
                    🗑 Sil
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {needsRevisionProperties.length > 0 && (
        <div className="revision-alert">
          <div className="revision-alert__title">
            ⚠️ {needsRevisionProperties.length} ilanınız için Broker revizyon istedi
          </div>
          {needsRevisionProperties.map((p) => (
            <Link to={`/portfoyler/${p.id}`} className="revision-alert__item" key={p.id}>
              <strong>{p.title}</strong>
              {p.revisionNote && <span> — "{p.revisionNote}"</span>}
              <span className="revision-alert__arrow"> →</span>
            </Link>
          ))}
        </div>
      )}

      {/* --- Metrik Kartları --- */}
      {/* Her karti ilgili sayfaya goturen tiklanabilir bir baglantiya cevirdik
          (daha once duz div'di, hicbir yere gitmiyordu). React Router'in
          Link bileseni kullanildigi icin "geri" tusu tarayicinin standart
          gecmis mekanizmasiyla otomatik olarak bu panele geri doner. */}
      <div className="metric-grid">
        <Link to="/portfoyler" state={{ presetStatus: 'active' }} className="metric-card metric-card--clickable">
          <div className="metric-card__label">Aktif Portföylerim</div>
          <div className="metric-card__value">{loading ? '…' : activePropertiesCount} İlan</div>
          <div className="metric-card__delta is-muted">Şu an yayında</div>
        </Link>
        <Link to="/komisyonlar" className="metric-card metric-card--clickable">
          <div className="metric-card__label">Bu Ayki Hedefim</div>
          {myTarget?.monthlyTarget ? (
            <>
              <div className="metric-card__value">
                %{myTarget.percentage} <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--muted)' }}>
                  ({money(myTarget.currentMonthSales)} / {money(myTarget.monthlyTarget)})
                </span>
              </div>
              <div className="metric-card__delta is-up">
                {myTarget.percentage >= 100 ? 'Hedef tamamlandı! 🎉' : `Hedefe ${100 - myTarget.percentage}% kaldı`}
              </div>
              <div style={{ height: 4, background: 'var(--paper-line)', borderRadius: 2, marginTop: 8, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${myTarget.percentage}%`, background: 'var(--brass)' }} />
              </div>
            </>
          ) : (
            <div className="metric-card__value" style={{ color: 'var(--muted)', fontSize: 16 }}>Hedef belirlenmedi</div>
          )}
        </Link>
        <Link to="/musteriler" state={{ presetHotOnly: true }} className="metric-card metric-card--clickable">
          <div className="metric-card__label">⚡ Acil Talepler</div>
          <div className="metric-card__value">{loading ? '…' : hotOpportunitiesCount} Müşteri</div>
          <div className="metric-card__delta is-muted">"Hemen" almak/kiralamak isteyen</div>
        </Link>
        <Link to="/takvim" className="metric-card metric-card--clickable">
          <div className="metric-card__label">Bu Haftaki Gösterim</div>
          <div className="metric-card__value">{loading ? '…' : weeklyShowingsCount} Gösterim</div>
          <div className="metric-card__delta is-muted">Bu hafta planlanan</div>
        </Link>
      </div>

      {/* --- Bugünün İş Planı + Akıllı Eşleştirmeler --- */}
      <div className="panel-grid-2">
        <div className="panel">
          <h3 className="panel__title">Bugünün İş Planı</h3>
          {loading ? (
            <div className="panel__empty">Yükleniyor…</div>
          ) : todayAppointments.length === 0 && todayTasks.length === 0 ? (
            <div className="panel__empty">Bugün için planlanmış bir şey yok. 🎉</div>
          ) : (
            <>
              {todayAppointments.map((appt) => {
                const typeInfo = APPOINTMENT_TYPES.find((t) => t.value === appt.type);
                return (
                  <Link to="/takvim" className="action-item action-item--clickable" key={`appt-${appt.id}`}>
                    <span className="action-item__dot">{typeInfo?.icon || '📌'}</span>
                    <div className="action-item__body">
                      <div className="action-item__title">{appt.title}</div>
                      <div className="action-item__meta">
                        {appt.time ? `🕒 ${appt.time}` : 'Saat belirtilmedi'} · {typeInfo?.label}
                      </div>
                    </div>
                  </Link>
                );
              })}
              {todayTasks.map((task) => (
                <Link to="/gorevler" className="action-item action-item--clickable" key={`task-${task.id}`}>
                  <span className="action-item__dot">{task.dueDate < new Date().toISOString().slice(0, 10) ? '🔴' : '🟡'}</span>
                  <div className="action-item__body">
                    <div className="action-item__title">{task.title}</div>
                    <div className="action-item__meta">
                      {task.dueDate < new Date().toISOString().slice(0, 10) ? 'Gecikti (görev)' : 'Bugün (görev)'}
                    </div>
                  </div>
                </Link>
              ))}
            </>
          )}
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed var(--paper-line)', display: 'flex', gap: 14 }}>
            <Link to="/takvim" style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-navy)' }}>
              Takvimi gör →
            </Link>
            <Link to="/gorevler" style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-navy)' }}>
              Tüm görevleri gör →
            </Link>
          </div>
        </div>
        <div className="panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="panel__title" style={{ margin: 0 }}>🔥 Sıcak Fırsatlar</h3>
            <Link to="/talepler" style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-navy)' }}>
              Tümünü Gör →
            </Link>
          </div>
          {loading ? (
            <div className="panel__empty">Yükleniyor…</div>
          ) : matches.length === 0 ? (
            <div className="panel__empty">Şu an güçlü bir eşleşme bulunamadı.</div>
          ) : (
            matches.map((m) => (
              <Link to={`/portfoyler/${m.property.id}`} className="match-card match-card--clickable" key={`${m.customer.id}-${m.property.id}`}>
                <span className="match-card__pct">%{m.score}</span>
                <div className="match-card__body">
                  <div className="match-card__title">{m.property.title}</div>
                  <div className="match-card__meta">
                    {m.customer.firstName} {m.customer.lastName} için · {m.property.district} · {money(m.property.price)}
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>

      {/* --- İşlemler Özet Panosu: Talep/Gösterme/Teklif/Tapu/Kapanış --- */}
      <div className="panel" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 className="panel__title" style={{ margin: 0 }}>🔄 İşlemlerim</h3>
          <Link to="/islemler" style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-navy)' }}>
            Tümünü Gör →
          </Link>
        </div>
        {loading ? (
          <div className="panel__empty">Yükleniyor…</div>
        ) : myTransactions.length === 0 ? (
          <div className="panel__empty">Henüz bir işlem başlatmadın.</div>
        ) : (
          <div className="kanban-board" style={{ marginTop: 12 }}>
            {TRANSACTION_STAGES.map((stage) => {
              const stageTransactions = myTransactions.filter((t) => t.stage === stage.value);
              return (
                <div className="kanban-column" key={stage.value}>
                  <div className="kanban-column__title">{stage.label} ({stageTransactions.length})</div>
                  {stageTransactions.length === 0 ? (
                    <div className="kanban-empty">Boş</div>
                  ) : (
                    stageTransactions.slice(0, 5).map((t) => {
                      const property = allPropertiesForLookup.find((p) => p.id === t.propertyId);
                      const customer = allCustomersForLookup.find((c) => c.id === t.customerId);
                      const days = Math.floor((Date.now() - new Date(t.stageChangedAt || t.createdAt).getTime()) / 86400000);
                      const isStale = t.stage !== 'closed' && days >= 7;
                      return (
                        <Link to="/islemler" className="kanban-card kanban-card--clickable" key={t.id}>
                          <div className="kanban-card__name">
                            {property?.title || t.externalPropertyLabel || 'Portföy belirtilmedi'}
                          </div>
                          <div className="kanban-card__meta">
                            {customer ? `${customer.firstName} ${customer.lastName}` : t.externalCustomerLabel || 'Müşteri belirtilmedi'}
                            {isStale && <span style={{ color: 'var(--danger)' }}> · ⏱ {days} gün</span>}
                          </div>
                        </Link>
                      );
                    })
                  )}
                  {stageTransactions.length > 5 && (
                    <div style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center', marginTop: 4 }}>
                      +{stageTransactions.length - 5} tane daha
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* --- Liderlik Tablosu (gamification) --- */}
      <div className="folder-panel" style={{ marginTop: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', margin: 0, fontSize: 16 }}>🏆 Liderlik Tablosu</h3>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              type="button"
              className={leaderboardPeriod === 'week' ? 'btn btn-primary' : 'btn btn-secondary'}
              style={{ fontSize: 12, padding: '5px 12px' }}
              onClick={() => setLeaderboardPeriod('week')}
            >
              Bu Hafta
            </button>
            <button
              type="button"
              className={leaderboardPeriod === 'month' ? 'btn btn-primary' : 'btn btn-secondary'}
              style={{ fontSize: 12, padding: '5px 12px' }}
              onClick={() => setLeaderboardPeriod('month')}
            >
              Bu Ay
            </button>
          </div>
        </div>
        {(() => {
          const rows = leaderboardPeriod === 'week' ? weeklyLeaderboard : monthlyLeaderboard;
          if (rows.length === 0) {
            return <div className="empty-state">Bu dönem için henüz veri yok.</div>;
          }
          return (
            <div className="table-scroll">
              <table style={{ width: '100%', minWidth: 480, borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase' }}>
                    <th style={{ padding: '6px 8px' }}>#</th>
                    <th style={{ padding: '6px 8px' }}>Danışman</th>
                    <th style={{ padding: '6px 8px' }}>Portföy</th>
                    <th style={{ padding: '6px 8px' }}>Müşteri</th>
                    <th style={{ padding: '6px 8px' }}>Görüşme</th>
                    <th style={{ padding: '6px 8px' }}>Satış Tutarı</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr
                      key={row.agentId}
                      style={{
                        borderTop: '1px solid var(--paper-line)',
                        background: row.agentId === user?.id ? 'var(--paper-line)' : 'transparent',
                        fontWeight: row.agentId === user?.id ? 700 : 400,
                      }}
                    >
                      <td style={{ padding: '8px' }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}</td>
                      <td style={{ padding: '8px' }}>{row.agentName}{row.agentId === user?.id ? ' (Siz)' : ''}</td>
                      <td style={{ padding: '8px' }}>{row.propertiesCount}</td>
                      <td style={{ padding: '8px' }}>{row.customersCount}</td>
                      <td style={{ padding: '8px' }}>{row.interactionsCount}</td>
                      <td style={{ padding: '8px', fontFamily: 'var(--font-mono)' }}>{money(row.salesValue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
