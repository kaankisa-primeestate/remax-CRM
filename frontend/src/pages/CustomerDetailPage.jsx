import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { propertiesApi } from '../api/properties';
import { customersApi, CUSTOMER_TYPES } from '../api/customers';
import StatusBadge from '../components/StatusBadge.jsx';
import CustomerFormModal from '../components/CustomerFormModal.jsx';
import InteractionTimeline from '../components/InteractionTimeline.jsx';
import AddInteractionForm from '../components/AddInteractionForm.jsx';
import { buildWhatsappUrl, buildMailtoUrl } from '../utils/contact.js';

export default function CustomerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [showEdit, setShowEdit] = useState(false);
  const [matches, setMatches] = useState([]);

  const load = useCallback(async () => {
    const data = await customersApi.getOne(id);
    setCustomer(data);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    customersApi.matchingProperties(id).then(setMatches).catch(() => setMatches([]));
  }, [id]);

  async function handleUpdate(payload) {
    await customersApi.update(id, payload);
    setShowEdit(false);
    load();
  }

  async function handleDelete() {
    if (!confirm('Bu müşteri kaydı kalıcı olarak silinecek. Emin misiniz?')) return;
    await customersApi.remove(id);
    navigate('/');
  }

  async function handleAddInteraction(payload) {
    await customersApi.addInteraction(id, payload);
    load();
  }

  if (!customer) return <div className="empty-state">Yükleniyor…</div>;

  const typeLabel = CUSTOMER_TYPES.find((t) => t.value === customer.type)?.label;
  const budgetLabel =
    customer.budget != null
      ? new Intl.NumberFormat('tr-TR', {
          style: 'currency',
          currency: customer.budgetCurrency || 'TRY',
          maximumFractionDigits: 0,
        }).format(customer.budget)
      : '—';

  return (
    <div>
      <Link to="/" style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--muted)' }}>
        ← Kayıt Defterine Dön
      </Link>

      <div className="dossier" style={{ marginTop: 16 }}>
        <div className="dossier__header">
          <div>
            <h2 className="dossier__name">
              {customer.firstName} {customer.lastName}
            </h2>
            <StatusBadge type={customer.type} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <a href={buildWhatsappUrl(customer.phone, `Merhaba ${customer.firstName}, size ulaşmak istedim.`)} target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ textDecoration: 'none', background: '#25D366', color: 'white', borderColor: '#25D366' }}>
              WhatsApp
            </a>
            {customer.email && (
              <a href={buildMailtoUrl(customer.email, 'Merhaba', `Merhaba ${customer.firstName},\n\n`)} className="btn btn-secondary" style={{ textDecoration: 'none' }}>
                E-posta
              </a>
            )}
            <button className="btn btn-secondary" onClick={() => setShowEdit(true)}>
              Düzenle
            </button>
            <button className="btn btn-danger" onClick={handleDelete}>
              Sil
            </button>
          </div>
        </div>

        <div className="dossier__field-grid">
          <div className="dossier__field">
            <label>Telefon</label>
            <div style={{ fontFamily: 'var(--font-mono)' }}>{customer.phone}</div>
          </div>
          <div className="dossier__field">
            <label>E-posta</label>
            <div>{customer.email || '—'}</div>
          </div>
          <div className="dossier__field">
            <label>Adres</label>
            <div>{customer.address || '—'}</div>
          </div>
          <div className="dossier__field">
            <label>Bütçe</label>
            <div style={{ fontFamily: 'var(--font-mono)' }}>{budgetLabel}</div>
          </div>
          <div className="dossier__field" style={{ gridColumn: '1 / -1' }}>
            <label>Aradığı Özellikler</label>
            <div>{customer.requirements || '—'}</div>
          </div>
          <div className="dossier__field" style={{ gridColumn: '1 / -1' }}>
            <label>Notlar</label>
            <div>{customer.notes || '—'}</div>
          </div>
        </div>

        {matches.length > 0 && (
          <>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, marginBottom: 12 }}>
              Uygun Portföyler
            </h3>
            <div style={{ marginBottom: 24 }}>
              {matches.map((m) => (
                <Link
                  key={m.property.id}
                  to={`/portfoyler/${m.property.id}`}
                  className="record-row"
                  style={{ textDecoration: 'none', color: 'inherit', display: 'flex', justifyContent: 'space-between' }}
                >
                  <span className="record-row__name">
                    {m.property.title} — {m.property.district}
                    {m.agentName ? ` (${m.agentName})` : ''}
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--muted)' }}>
                    {m.matchedCount}/{m.totalCount} kelime eşleşti (%{m.score})
                  </span>
                </Link>
              ))}
            </div>
          </>
        )}

        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, marginBottom: 12 }}>
          Görüşme Geçmişi
        </h3>
        <AddInteractionForm onSubmit={handleAddInteraction} />
        <InteractionTimeline interactions={customer.interactions} />
      </div>

      {showEdit && (
        <CustomerFormModal
          initialValues={customer}
          onSubmit={handleUpdate}
          onClose={() => setShowEdit(false)}
        />
      )}
    </div>
  );
}
