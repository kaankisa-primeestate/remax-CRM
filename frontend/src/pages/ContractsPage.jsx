import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Check, AlertTriangle, ChevronRight, FileText, SearchX } from 'lucide-react';
import { EmptyState, TableSkeleton } from '../components/Feedback';
import { PanelHead } from '../components/PanelHead';
import { appointmentsApi } from '../api/appointments';
import { customersApi } from '../api/customers';
import { propertiesApi } from '../api/properties';
import { usersApi } from '../api/auth';

function formatDateTime(d) {
  return new Date(d).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// Sozlesmeler & Tapu: Yer Gosterme kayitlari burada arsivlenir --
// hukuki koruma amacli bu kayitlar, danismanin kendi Takvim'inde
// kaybolup gitmesin diye Broker'in her zaman ulasabilecegi merkezi
// bir yerde tutulur (bildirim zili de bu kayitlar icin calisir).
export default function ContractsPage() {
  const [showings, setShowings] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [properties, setProperties] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all | accepted | pending

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [appts, custs, props, agentList] = await Promise.all([
        appointmentsApi.list().catch(() => []),
        customersApi.list({}).catch(() => []),
        propertiesApi.list({}).catch(() => []),
        usersApi.listAgents().catch(() => []),
      ]);
      const showingAppts = appts
        .filter((a) => a.type === 'showing')
        .sort((a, b) => {
          const da = a.disclosureAcceptedAt || a.date;
          const db = b.disclosureAcceptedAt || b.date;
          return new Date(db).getTime() - new Date(da).getTime();
        });
      setShowings(showingAppts);
      setCustomers(custs);
      setProperties(props);
      setAgents(agentList);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const agentNameById = Object.fromEntries(agents.map((a) => [a.id, a.name]));

  const visible = showings.filter((s) => {
    if (filter === 'accepted') return s.disclosureAccepted;
    if (filter === 'pending') return !s.disclosureAccepted;
    return true;
  });

  return (
    <div>
      <div className="cl-page-header">
        <div className="cl-page-header__text">
          <nav className="cl-breadcrumb" aria-label="Sayfa yolu">
            <Link to="/">Ana Sayfa</Link>
            <ChevronRight size={14} strokeWidth={2} aria-hidden="true" />
            <span aria-current="page">Sözleşmeler &amp; Tapu</span>
          </nav>
          <h2 className="cl-page-title">Sözleşmeler &amp; Tapu</h2>
          <p className="cl-page-subtitle">
            Danışmanların müşterilere yaptığı ilan gösterimlerinin hukuki kayıt arşivi.
            Beyan onaylı kayıtlar, danışmanın komisyon hakkını kanıtlayan belgelerdir.
          </p>
        </div>
      </div>

      <div className="folder-panel">
        <PanelHead
          Icon={FileText}
          title="Yer gösterme kayıtları"
          note={filter === 'accepted' ? 'Beyanı alınmış kayıtlar'
            : filter === 'pending' ? 'Beyanı bekleyen kayıtlar'
            : 'Tüm kayıtlar'}
          meta={loading ? undefined : `${visible.length} kayıt`}
        >
          <div className="segmented" role="group" aria-label="Beyan durumuna göre filtre">
            <button type="button" className={`segmented__item${filter === 'all' ? ' is-active' : ''}`} aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>
              Tümü ({showings.length})
            </button>
            <button type="button" className={`segmented__item${filter === 'accepted' ? ' is-active' : ''}`} aria-pressed={filter === 'accepted'} onClick={() => setFilter('accepted')}>
              <Check size={14} strokeWidth={2} /> Beyan Alındı ({showings.filter((s) => s.disclosureAccepted).length})
            </button>
            <button type="button" className={`segmented__item${filter === 'pending' ? ' is-active' : ''}`} aria-pressed={filter === 'pending'} onClick={() => setFilter('pending')}>
              <AlertTriangle size={14} strokeWidth={2} /> Beklemede ({showings.filter((s) => !s.disclosureAccepted).length})
            </button>
          </div>
        </PanelHead>
        {loading ? (
          <TableSkeleton rows={5} columns={4} label="Yer gösterme kayıtları yükleniyor…" />
        ) : visible.length === 0 ? (
          filter === 'all' ? (
            <EmptyState
              Icon={FileText}
              title="Henüz yer gösterme kaydı yok"
              note="Danışmanlar ilan gösterimi kaydettikçe bu arşiv dolar."
            />
          ) : (
            <EmptyState
              Icon={SearchX}
              title="Bu filtrede yer gösterme kaydı yok"
              note="Tüm kayıtları görmek için filtreyi kaldırabilirsiniz."
              actionLabel="Tüm kayıtları göster"
              onAction={() => setFilter('all')}
            />
          )
        ) : (
          visible.map((s) => {
            const customer = customers.find((c) => c.id === s.customerId);
            const property = properties.find((p) => p.id === s.propertyId);
            return (
              <div key={s.id} className="disclosure-row">
                <span className={s.disclosureAccepted ? 'disclosure-badge disclosure-badge--ok' : 'disclosure-badge'} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  {s.disclosureAccepted ? (<><Check size={11} /> Beyan Alındı</>) : (<><AlertTriangle size={11} /> Beklemede</>)}
                </span>
                <div className="disclosure-row__body">
                  <div className="disclosure-row__title">
                    {property ? (
                      <Link to={`/portfoyler/${property.id}`}>{property.title}</Link>
                    ) : (
                      s.title
                    )}
                  </div>
                  <div className="disclosure-row__meta">
                    Danışman: {agentNameById[s.agentId] || 'Bilinmeyen'}
                    {customer && (
                      <> · Müşteri: <Link to={`/musteriler/${customer.id}`}>{customer.firstName} {customer.lastName}</Link></>
                    )}
                    {' · '}Gösterim tarihi: {new Date(s.date).toLocaleDateString('tr-TR')}{s.time ? ` ${s.time}` : ''}
                    {s.disclosureAcceptedAt && <> · Beyan: {formatDateTime(s.disclosureAcceptedAt)}</>}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
