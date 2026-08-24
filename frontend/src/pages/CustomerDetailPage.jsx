import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { propertiesApi } from '../api/properties';
import { customersApi, CUSTOMER_TYPES } from '../api/customers';
import StatusBadge from '../components/StatusBadge.jsx';
import CustomerFormModal from '../components/CustomerFormModal.jsx';
import InteractionTimeline from '../components/InteractionTimeline.jsx';
import AddInteractionForm from '../components/AddInteractionForm.jsx';
import { buildWhatsappUrl, buildMailtoUrl } from '../utils/contact.js';
import { tasksApi } from '../api/tasks';
import { PIPELINE_STAGES } from '../constants/pipeline.js';
import { LEAD_SOURCES } from '../constants/leadSources.js';
import MatchConfidenceBadge from '../components/MatchConfidenceBadge.jsx';

const TIMELINE_LABELS = {
  immediate: 'Hemen',
  '1_3_months': '1–3 ay içinde',
  '3_6_months': '3–6 ay içinde',
  later: 'Daha sonra',
};

export default function CustomerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [showEdit, setShowEdit] = useState(false);
  const [matches, setMatches] = useState([]);

  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await customersApi.getOne(id);
      setCustomer(data);
    } catch {
      setLoadError(true);
    }
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

    // Otomatik Takip Hatirlaticisi: gorusme kaydedildikten sonra, "3 gun
    // sonra tekrar ara" gibi bir gorev onerelim -- danisman isterse kabul
    // eder, istemezse iptal eder. Musteriyi kaybetmemek icin kucuk ama
    // degerli bir dokunus.
    const wantsFollowUp = window.confirm(
      `Görüşme kaydedildi. ${customer.firstName} ${customer.lastName} için 3 gün sonrasına bir "takip et" görevi oluşturulsun mu?`,
    );
    if (wantsFollowUp) {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 3);
      try {
        await tasksApi.create({
          title: `Takip: ${customer.firstName} ${customer.lastName}`,
          dueDate: dueDate.toISOString().slice(0, 10),
          customerId: customer.id,
        });
      } catch (err) {
        // Sessizce yut -- gorev olusturma basarisiz olsa bile ana islem
        // (gorusme kaydi) zaten tamamlandi, kullaniciyi bununla ugrastırma
      }
    }
  }

  async function handleStageChange(newStage) {
    const previous = customer.pipelineStage;
    setCustomer((c) => ({ ...c, pipelineStage: newStage })); // iyimser guncelleme
    try {
      await customersApi.update(id, { pipelineStage: newStage });
    } catch (err) {
      setCustomer((c) => ({ ...c, pipelineStage: previous })); // hata olursa geri al
      alert('Aşama güncellenemedi, tekrar deneyin.');
    }
  }

  if (loadError) return <div className="empty-state">Müşteri yüklenemedi. Lütfen sayfayı yenileyin.</div>;
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

  // "Talep tamamlanma orani" -- Hizli Kayit'tan gelen musterilerde eksik
  // kalabilecek alanlari danismana hatirlatir, ama zorunlu kilmaz.
  const COMPLETION_CHECKLIST = [
    { label: 'Bütçe', filled: !!customer.budget },
    { label: 'Ne aradığı', filled: !!customer.propertyInterest },
    { label: 'Bölge tercihi', filled: !!(customer.preferredDistricts && customer.preferredDistricts.length) },
    { label: 'Zaman çizelgesi', filled: !!customer.purchaseTimeline },
    { label: 'E-posta', filled: !!customer.email },
    { label: 'Adres', filled: !!customer.address },
    { label: 'Detaylı aradığı özellikler', filled: !!customer.requirements },
    { label: 'Nereden geldiği', filled: !!customer.leadSource },
  ];
  const filledCount = COMPLETION_CHECKLIST.filter((c) => c.filled).length;
  const completionPct = Math.round((filledCount / COMPLETION_CHECKLIST.length) * 100);
  const missingFields = COMPLETION_CHECKLIST.filter((c) => !c.filled);

  return (
    <div>
      <button
        type="button"
        onClick={() => navigate(-1)}
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
          color: 'var(--muted)',
          background: 'transparent',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
        }}
      >
        ← Geri Dön
      </button>

      <div className="dossier" style={{ marginTop: 16 }}>
        <div className="dossier__header">
          <div>
            <h2 className="dossier__name">
              {customer.firstName} {customer.lastName}
            </h2>
            <StatusBadge type={customer.type} />
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
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

        <div className="stage-picker">
          <span className="stage-picker__label">Süreç Aşaması:</span>
          <div className="stage-picker__options">
            {PIPELINE_STAGES.map((s) => (
              <button
                key={s.key}
                type="button"
                className={`stage-picker__chip${customer.pipelineStage === s.key ? ' is-active' : ''}`}
                onClick={() => handleStageChange(s.key)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {completionPct < 100 && (
          <div className="completion-box">
            <div className="completion-box__row">
              <span className="completion-box__label">Talep %{completionPct} tamamlandı</span>
              <div className="completion-box__track">
                <div className="completion-box__fill" style={{ width: `${completionPct}%` }} />
              </div>
            </div>
            <div className="completion-box__missing">
              Eksik bilgiler:{' '}
              {missingFields.map((f) => (
                <button key={f.label} type="button" className="completion-box__chip" onClick={() => setShowEdit(true)}>
                  + {f.label}
                </button>
              ))}
            </div>
          </div>
        )}

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
          {customer.propertyInterest && (
            <div className="dossier__field">
              <label>Ne Arıyor</label>
              <div>{customer.propertyInterest}</div>
            </div>
          )}
          {customer.preferredDistricts && customer.preferredDistricts.length > 0 && (
            <div className="dossier__field">
              <label>Bölge Tercihi</label>
              <div>{customer.preferredDistricts.join(', ')}</div>
            </div>
          )}
          {customer.purchaseTimeline && (
            <div className="dossier__field">
              <label>Zaman Çizelgesi</label>
              <div>{TIMELINE_LABELS[customer.purchaseTimeline] || customer.purchaseTimeline}</div>
            </div>
          )}
          {customer.leadSource && (
            <div className="dossier__field">
              <label>Nereden Geldi</label>
              <div>{LEAD_SOURCES.find((s) => s.value === customer.leadSource)?.label || customer.leadSource}</div>
            </div>
          )}
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
                  style={{ textDecoration: 'none', color: 'inherit', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}
                >
                  <span className="record-row__name">
                    {m.property.title} — {m.property.district}
                    {m.agentName ? ` (${m.agentName})` : ''}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--muted)' }}>
                      {m.matchedCount}/{m.totalCount} kelime eşleşti (%{m.score})
                    </span>
                    <MatchConfidenceBadge match={m} />
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
