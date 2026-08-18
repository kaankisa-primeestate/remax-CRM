import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { propertiesApi, PROPERTY_TYPES } from '../api/properties';
import { CATEGORY_FIELDS } from '../data/categoryFields';
import { ListingTypeBadge } from '../components/PropertyStatusBadge.jsx';
import PropertyFormModal from '../components/PropertyFormModal.jsx';
import PropertyShareModal from '../components/PropertyShareModal.jsx';
import PhotoLightbox from '../components/PhotoLightbox.jsx';
import QuickStatusSelect from '../components/QuickStatusSelect.jsx';
import PropertyComments from '../components/PropertyComments.jsx';
import MatchConfidenceBadge from '../components/MatchConfidenceBadge.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function PropertyDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isBroker } = useAuth();
  const [property, setProperty] = useState(null);
  const [showEdit, setShowEdit] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [matches, setMatches] = useState([]);

  const load = useCallback(async () => {
    const data = await propertiesApi.getOne(id);
    setProperty(data);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    propertiesApi.matchingCustomers(id).then(setMatches).catch(() => setMatches([]));
  }, [id]);

  async function handleUpdate(payload) {
    await propertiesApi.update(id, payload);
    setShowEdit(false);
    load();
  }

  async function handleDelete() {
    if (!confirm('Bu portföy kalıcı olarak silinecek. Emin misiniz?')) return;
    await propertiesApi.remove(id);
    navigate('/portfoyler');
  }

  async function handleStatusChange(newStatus) {
    try {
      await propertiesApi.update(id, { status: newStatus });
      setProperty((prev) => ({ ...prev, status: newStatus }));
    } catch (err) {
      const message = err?.response?.data?.message ?? 'Durum güncellenemedi.';
      alert(Array.isArray(message) ? message.join(', ') : message);
    }
  }

  if (!property) return <div className="empty-state">Yükleniyor…</div>;

  const typeLabel = PROPERTY_TYPES.find((t) => t.value === property.propertyType)?.label;
  // Mahremiyet Duvarı: Broker her zaman duzenleyebilir; Danisman sadece
  // KENDI ilanini duzenleyebilir (Ofis Portfoyu'nden gelen baskasinin
  // ilaninda duzenleme/silme/durum degistirme butonlari gizlenir).
  const canEdit = isBroker || property.agentId === user?.id;
  const priceLabel = new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: property.priceCurrency || 'TRY',
    maximumFractionDigits: 0,
  }).format(property.price);

  // Kategoriye ozel alanlari (CATEGORY_FIELDS) kullanarak detaylari ve
  // one cikan ozellikleri dinamik olarak hesapla -- wizard'da toplanan
  // TUM bilgiler burada gorunsun diye (10 kategorinin hepsi icin gecerli)
  const categoryFieldDefs = CATEGORY_FIELDS[property.propertyType] || [];
  function fieldRawValue(field) {
    return field.extra ? property.extraAttributes?.[field.key] : property[field.key];
  }
  const detailFields = categoryFieldDefs.filter((f) => {
    const v = fieldRawValue(f);
    return f.type !== 'boolean' && v !== undefined && v !== null && v !== '';
  });
  const activeFeatures = categoryFieldDefs.filter((f) => f.type === 'boolean' && !!fieldRawValue(f));

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
            <h2 className="dossier__name">{property.title}</h2>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <ListingTypeBadge listingType={property.listingType} />
              {canEdit ? (
                <QuickStatusSelect status={property.status} onChange={handleStatusChange} />
              ) : (
                <span className="status-badge" style={{ background: 'var(--paper-line)', color: 'var(--muted)' }}>
                  {property.status === 'active' ? 'Aktif' : property.status}
                </span>
              )}
              <span className="status-badge" style={{ background: 'var(--paper-line)', color: 'var(--slate)' }}>
                {typeLabel}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-secondary" onClick={() => setShowShare(true)}>Paylaş</button>
            {canEdit && (
              <>
                <button className="btn btn-secondary" onClick={() => setShowEdit(true)}>Düzenle</button>
                <button className="btn btn-danger" onClick={handleDelete}>Sil</button>
              </>
            )}
          </div>
        </div>

        {property.status === 'needs_revision' && property.revisionNote && (
          <div className="revision-banner">
            <strong>Broker revizyon istedi:</strong> {property.revisionNote}
          </div>
        )}

        <div className="dossier__field-grid">
          <div className="dossier__field">
            <label>Konum</label>
            <div>{property.neighborhood}, {property.district} / {property.province}</div>
          </div>
          <div className="dossier__field">
            <label>Fiyat</label>
            <div style={{ fontFamily: 'var(--font-mono)' }}>{priceLabel}</div>
          </div>
          <div className="dossier__field">
            <label>Metrekare</label>
            <div>{property.areaM2} m²</div>
          </div>
          <div className="dossier__field">
            <label>Tapu Durumu</label>
            <div>{property.deedStatus}</div>
          </div>
          <div className="dossier__field">
            <label>Krediye Uygunluk</label>
            <div>{property.mortgageEligible ? 'Uygun' : 'Uygun Değil'}</div>
          </div>
          {property.contractEndDate && (
            <div className="dossier__field">
              <label>Sözleşme Bitiş Tarihi</label>
              <div>{new Date(property.contractEndDate).toLocaleDateString('tr-TR')}</div>
            </div>
          )}

          {detailFields.map((field) => {
            const v = fieldRawValue(field);
            const displayValue = field.type === 'date'
              ? new Date(v).toLocaleDateString('tr-TR')
              : (typeof v === 'number' ? new Intl.NumberFormat('tr-TR').format(v) : v);
            return (
              <div className="dossier__field" key={field.key}>
                <label>{field.label}</label>
                <div>{displayValue}</div>
              </div>
            );
          })}

          <div className="dossier__field" style={{ gridColumn: '1 / -1' }}>
            <label>Öne Çıkan Özellikler</label>
            <div>
              {activeFeatures.length ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                  {activeFeatures.map((f) => (
                    <span key={f.key} className="status-badge" style={{ background: '#eef4ea', color: 'var(--success)' }}>
                      ✓ {f.label}
                    </span>
                  ))}
                </div>
              ) : '—'}
            </div>
          </div>
          {property.notes && (
            <div className="dossier__field" style={{ gridColumn: '1 / -1' }}>
              <label>Notlar</label>
              <div>{property.notes}</div>
            </div>
          )}
        </div>

        {property.photoUrls && property.photoUrls.length > 0 && (
          <>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, marginBottom: 12 }}>Fotoğraflar</h3>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {property.photoUrls.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt={`${property.title} fotoğraf ${i + 1}`}
                  style={{ width: 160, height: 120, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--paper-line)', cursor: 'pointer' }}
                  onError={(e) => { e.target.style.display = 'none'; }}
                  onClick={() => setLightboxIndex(i)}
                />
              ))}
            </div>
          </>
        )}

        {matches.length > 0 && (
          <>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, marginBottom: 12, marginTop: 24 }}>
              Uygun Müşteriler
            </h3>
            <div>
              {matches.map((m) => (
                <Link
                  key={m.customer.id}
                  to={`/musteriler/${m.customer.id}`}
                  className="record-row"
                  style={{ textDecoration: 'none', color: 'inherit', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}
                >
                  <span className="record-row__name">
                    {m.customer.firstName} {m.customer.lastName}
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
      </div>

      <PropertyComments propertyId={property.id} />

      {showEdit && (
        <PropertyFormModal
          initialValues={property}
          onSubmit={handleUpdate}
          onClose={() => setShowEdit(false)}
        />
      )}

      {showShare && (
        <PropertyShareModal propertyId={property.id} propertyTitle={property.title} onClose={() => setShowShare(false)} />
      )}

      <PhotoLightbox
        photos={property.photoUrls || []}
        index={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onNavigate={setLightboxIndex}
      />
    </div>
  );
}
