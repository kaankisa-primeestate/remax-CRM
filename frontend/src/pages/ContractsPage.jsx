import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
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
    const [appts, custs, props, agentList] = await Promise.all([
      appointmentsApi.list(),
      customersApi.list({}),
      propertiesApi.list({}),
      usersApi.listAgents(),
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
    setLoading(false);
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
      <h2 className="dossier__name" style={{ marginBottom: 16 }}>Sözleşmeler & Tapu</h2>

      <div className="folder-panel" style={{ marginBottom: 20 }}>
        <h3 style={{ fontFamily: 'var(--font-display)', marginTop: 0, fontSize: 16 }}>Yer Gösterme Kayıtları</h3>
        <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 14 }}>
          Danışmanların müşterilere yaptığı ilan gösterimlerinin hukuki kayıt arşivi. Beyan onaylı kayıtlar,
          danışmanın komisyon hakkını kanıtlayan belgelerdir.
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className={filter === 'all' ? 'btn btn-primary' : 'btn btn-secondary'} style={{ fontSize: 12, padding: '6px 12px' }} onClick={() => setFilter('all')}>
            Tümü ({showings.length})
          </button>
          <button type="button" className={filter === 'accepted' ? 'btn btn-primary' : 'btn btn-secondary'} style={{ fontSize: 12, padding: '6px 12px' }} onClick={() => setFilter('accepted')}>
            ✓ Beyan Alındı ({showings.filter((s) => s.disclosureAccepted).length})
          </button>
          <button type="button" className={filter === 'pending' ? 'btn btn-primary' : 'btn btn-secondary'} style={{ fontSize: 12, padding: '6px 12px' }} onClick={() => setFilter('pending')}>
            ⚠️ Beklemede ({showings.filter((s) => !s.disclosureAccepted).length})
          </button>
        </div>
      </div>

      <div className="folder-panel">
        {loading ? (
          <div className="empty-state">Yükleniyor…</div>
        ) : visible.length === 0 ? (
          <div className="empty-state">Bu filtrede yer gösterme kaydı yok.</div>
        ) : (
          visible.map((s) => {
            const customer = customers.find((c) => c.id === s.customerId);
            const property = properties.find((p) => p.id === s.propertyId);
            return (
              <div key={s.id} className="disclosure-row">
                <span className={s.disclosureAccepted ? 'disclosure-badge disclosure-badge--ok' : 'disclosure-badge'}>
                  {s.disclosureAccepted ? '✓ Beyan Alındı' : '⚠️ Beklemede'}
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

      <div className="folder-panel" style={{ marginTop: 20 }}>
        <p style={{ color: 'var(--muted)', fontSize: 13 }}>
          Bu bölüm ileride genişletilecek: sözleşme bitiş tarihleri (Broker Dashboard'da zaten takip ediliyor),
          vekaletname durumları ve tapu sürecinin aşamaları da buraya eklenecek.
        </p>
      </div>
    </div>
  );
}
