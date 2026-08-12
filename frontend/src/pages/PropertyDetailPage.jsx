import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { propertiesApi, PROPERTY_TYPES } from '../api/properties';
import { PropertyStatusBadge, ListingTypeBadge } from '../components/PropertyStatusBadge.jsx';
import PropertyFormModal from '../components/PropertyFormModal.jsx';
import PropertyShareModal from '../components/PropertyShareModal.jsx';
import PhotoLightbox from '../components/PhotoLightbox.jsx';

export default function PropertyDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
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

  if (!property) return <div className="empty-state">Yükleniyor…</div>;

  const typeLabel = PROPERTY_TYPES.find((t) => t.value === property.propertyType)?.label;
  const priceLabel = new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: property.priceCurrency || 'TRY',
    maximumFractionDigits: 0,
  }).format(property.price);
  const isResidential = property.propertyType === 'apartment' || property.propertyType === 'timeshare';
  const extras = [
    property.hasPool && 'Havuz',
    property.hasGym && 'Spor Salonu',
    property.hasSecurity && 'Güvenlik',
    property.hasParking && 'Otopark',
  ].filter(Boolean);

  return (
    <div>
      <Link to="/portfoyler" style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--muted)' }}>
        ← Portföy Listesine Dön
      </Link>

      <div className="dossier" style={{ marginTop: 16 }}>
        <div className="dossier__header">
          <div>
            <h2 className="dossier__name">{property.title}</h2>
            <div style={{ display: 'flex', gap: 8 }}>
              <ListingTypeBadge listingType={property.listingType} />
              <PropertyStatusBadge status={property.status} />
              <span className="status-badge" style={{ background: 'var(--paper-line)', color: 'var(--slate)' }}>
                {typeLabel}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary" onClick={() => setShowShare(true)}>Paylaş</button>
            <button className="btn btn-secondary" onClick={() => setShowEdit(true)}>Düzenle</button>
            <button className="btn btn-danger" onClick={handleDelete}>Sil</button>
          </div>
        </div>

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

          {isResidential && (
            <>
              <div className="dossier__field">
                <label>Oda Sayısı</label>
                <div>{property.rooms || '—'}</div>
              </div>
              <div className="dossier__field">
                <label>Banyo Sayısı</label>
                <div>{property.bathrooms ?? '—'}</div>
              </div>
              <div className="dossier__field">
                <label>Bulunduğu Kat</label>
                <div>{property.floor || '—'}</div>
              </div>
              <div className="dossier__field">
                <label>Isıtma Tipi</label>
                <div>{property.heatingType || '—'}</div>
              </div>
              <div className="dossier__field">
                <label>Aidat</label>
                <div>{property.dues ? `₺${property.dues}` : '—'}</div>
              </div>
              <div className="dossier__field">
                <label>Yapı Yaşı</label>
                <div>{property.buildingAge ?? '—'}</div>
              </div>
            </>
          )}

          <div className="dossier__field">
            <label>Manzara</label>
            <div>{property.view || '—'}</div>
          </div>
          <div className="dossier__field">
            <label>Cephe</label>
            <div>{property.facade || '—'}</div>
          </div>
          <div className="dossier__field" style={{ gridColumn: '1 / -1' }}>
            <label>Ek Özellikler</label>
            <div>{extras.length ? extras.join(', ') : '—'}</div>
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
                  style={{ textDecoration: 'none', color: 'inherit', display: 'flex', justifyContent: 'space-between' }}
                >
                  <span className="record-row__name">
                    {m.customer.firstName} {m.customer.lastName}
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
      </div>

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
