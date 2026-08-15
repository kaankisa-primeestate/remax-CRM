import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { propertiesApi } from '../api/properties';
import { customersApi, CUSTOMER_TYPES } from '../api/customers';
import { dashboardApi } from '../api/dashboard';
import { tasksApi } from '../api/tasks';
import { appointmentsApi, APPOINTMENT_TYPES } from '../api/appointments';
import { PIPELINE_STAGES } from '../constants/pipeline.js';

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
  const [allCustomers, setAllCustomers] = useState([]);
  const [todayTasks, setTodayTasks] = useState([]);
  const [todayAppointments, setTodayAppointments] = useState([]);
  const [needsRevisionProperties, setNeedsRevisionProperties] = useState([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const [properties, customers, targetProgress, tasks, appointments, revisionProperties] = await Promise.all([
        propertiesApi.list({ status: 'active' }),
        customersApi.list({}),
        dashboardApi.myTarget().catch(() => null),
        tasksApi.list().catch(() => []),
        appointmentsApi.list().catch(() => []),
        propertiesApi.list({ status: 'needs_revision' }).catch(() => []),
      ]);
      if (cancelled) return;
      setActivePropertiesCount(properties.length);
      setMyTarget(targetProgress);
      setAllCustomers(customers);
      setNeedsRevisionProperties(revisionProperties);

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

  return (
    <div>
      <h2 className="dossier__name" style={{ marginBottom: 4 }}>
        Merhaba{firstName ? `, ${firstName}` : ''} 👋
      </h2>
      <p style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 13, marginBottom: 20 }}>
        {new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
      </p>

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
      <div className="metric-grid">
        <div className="metric-card">
          <div className="metric-card__label">Aktif Portföylerim</div>
          <div className="metric-card__value">{loading ? '…' : activePropertiesCount} İlan</div>
          <div className="metric-card__delta is-muted">Şu an yayında</div>
        </div>
        <div className="metric-card">
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
        </div>
        <div className="metric-card">
          <div className="metric-card__label">Sıcak Fırsatlar<span className="soon-badge">Yakında</span></div>
          <div className="metric-card__value" style={{ color: 'var(--muted)', fontSize: 16 }}>—</div>
        </div>
        <div className="metric-card">
          <div className="metric-card__label">Bu Haftaki Gösterim<span className="soon-badge">Yakında</span></div>
          <div className="metric-card__value" style={{ color: 'var(--muted)', fontSize: 16 }}>—</div>
        </div>
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
          <h3 className="panel__title">Akıllı Eşleştirmeler</h3>
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

      {/* --- Müşteri Takip Kanban Panosu --- */}
      <div className="panel">
        <h3 className="panel__title">Müşteri Takip Panosu</h3>
        <div className="kanban-board">
          {PIPELINE_STAGES.map((stage) => {
            const stageCustomers = allCustomers.filter((c) => (c.pipelineStage || 'new_contact') === stage.key);
            return (
              <div className="kanban-column" key={stage.key}>
                <div className="kanban-column__title">{stage.label} ({stageCustomers.length})</div>
                {stageCustomers.length === 0 ? (
                  <div className="kanban-empty">Bu aşamada müşteri yok</div>
                ) : (
                  stageCustomers.map((c) => (
                    <Link to={`/musteriler/${c.id}`} className="kanban-card kanban-card--clickable" key={c.id}>
                      <div className="kanban-card__name">{c.firstName} {c.lastName}</div>
                      <div className="kanban-card__meta">
                        {CUSTOMER_TYPES.find((t) => t.value === c.type)?.label}
                        {c.propertyInterest ? ` · ${c.propertyInterest}` : ''}
                      </div>
                    </Link>
                  ))
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
