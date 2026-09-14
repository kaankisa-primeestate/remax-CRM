import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { FileText, Check, ChevronRight, ArrowLeft, ImageOff } from 'lucide-react';
import { propertiesApi, PROPERTY_TYPES, formatPropertyPrice } from '../api/properties';
import { apiClient } from '../api/client.js';
import { usersApi } from '../api/auth';
import { buildWhatsappUrl } from '../utils/contact.js';
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
  const [sendingAuth, setSendingAuth] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [anaFoto, setAnaFoto] = useState(0); // kunyedeki buyuk fotografin sirasi
  const [danismanlar, setDanismanlar] = useState([]); // kimin ilani gosterebilmek icin
  const [matches, setMatches] = useState([]);

  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await propertiesApi.getOne(id);
      setProperty(data);
    } catch {
      setLoadError(true);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    propertiesApi.matchingCustomers(id).then(setMatches).catch(() => setMatches([]));
  }, [id]);

  // Danisman kadrosu: yalnizca isim doner, Danisman'a da acik. Kunyede
  // "kimin ilani" yazabilmek icin -- ofisteki diger danismanlar gorsun.
  useEffect(() => {
    usersApi.listAgentRoster().then(setDanismanlar).catch(() => setDanismanlar([]));
  }, []);

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

  // Mulk sahibine, portfoyun GUNCEL verisinden otomatik doldurulmus
  // Yetkilendirme Sozlesmesi'ni WhatsApp uzerinden dijital imzaya gonderir.
  async function handleSendAuthorization() {
    setSendingAuth(true);
    try {
      const { data } = await apiClient.post(`/digital-documents/authorization/${id}`);
      const link = `${window.location.origin}/belge/${data.token}`;
      const message =
        `Sayın ${property.ownerName},\n\n` +
        `"${property.title}" mülkünüz için Satılık Portföy Yetkilendirme Sözleşmesi'ni hazırladık. ` +
        `Lütfen aşağıdaki linke tıklayıp inceleyip onaylar mısınız:\n\n${link}\n\n` +
        `RE/MAX Prime`;
      window.open(buildWhatsappUrl(property.ownerPhone, message), '_blank');
    } catch (err) {
      alert(err?.response?.data?.message || 'Link oluşturulamadı, tekrar deneyin.');
    } finally {
      setSendingAuth(false);
    }
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

  if (loadError) return <div className="empty-state">Portföy yüklenemedi. Lütfen sayfayı yenileyin.</div>;
  if (!property) return <div className="empty-state">Yükleniyor…</div>;

  const typeLabel = PROPERTY_TYPES.find((t) => t.value === property.propertyType)?.label;
  // Mahremiyet Duvarı: Broker her zaman duzenleyebilir; Danisman sadece
  // KENDI ilanini duzenleyebilir (Ofis Portfoyu'nden gelen baskasinin
  // ilaninda duzenleme/silme/durum degistirme butonlari gizlenir).
  const canEdit = isBroker || property.agentId === user?.id;
  const priceLabel = formatPropertyPrice(property);

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

  // Kunye satirlari: sabit alanlar + kategoriye ozel alanlar tek listede.
  // Bos deger yazan satir acilmaz.
  const danismanAdi = danismanlar.find((a) => a.id === property.agentId)?.name;
  // Kayit kimligi UUID; ilan sitelerindeki gibi sirali numaramiz yok.
  // Ilk sekiz karakter ofis icinde ayirt etmeye ve aramaya yeter.
  const ilanNo = property.id ? String(property.id).slice(0, 8).toUpperCase() : null;

  const kunyeSatirlari = [
    ['İlan No', ilanNo],
    ['İlan Tarihi', property.createdAt
      ? new Date(property.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
      : null],
    ['Emlak Tipi', typeLabel],
    ['Metrekare', property.areaM2 ? `${property.areaM2} m²` : null],
    ['Tapu Durumu', property.deedStatus],
    ['Krediye Uygunluk', property.mortgageEligible ? 'Uygun' : 'Uygun Değil'],
    ...detailFields.map((field) => {
      const v = fieldRawValue(field);
      const metin = field.type === 'date'
        ? new Date(v).toLocaleDateString('tr-TR')
        : (typeof v === 'number' ? new Intl.NumberFormat('tr-TR').format(v) : v);
      return [field.label, metin];
    }),
    ['Sözleşme Bitişi', property.contractEndDate
      ? new Date(property.contractEndDate).toLocaleDateString('tr-TR')
      : null],
    ['Danışman', danismanAdi],
  ].filter(([, deger]) => deger !== undefined && deger !== null && deger !== '');

  const fotograflar = property.photoUrls || [];
  const kapakIndex = Math.min(anaFoto, Math.max(0, fotograflar.length - 1));
  // Serit tek satirda kalsin: bes hucre. Fazlasi varsa son hucre "+N" olur.
  const seritKucukler = fotograflar.length > 5 ? fotograflar.slice(0, 4) : fotograflar.slice(0, 5);
  const kalanFoto = fotograflar.length - seritKucukler.length;

  return (
    <div>
      {/* Kirinti yolu nerede oldugunu soyler; "Geri" ise listeye
          filtreleriyle birlikte doner. Ikisi ayri isler. */}
      <nav className="cl-breadcrumb cl-breadcrumb--detail" aria-label="Sayfa yolu">
        <button type="button" className="cl-back" onClick={() => navigate(-1)}>
          <ArrowLeft size={14} strokeWidth={2} aria-hidden="true" /> Geri
        </button>
        <Link to="/">Ana Sayfa</Link>
        <ChevronRight size={14} strokeWidth={2} aria-hidden="true" />
        <Link to="/portfoyler">Portföy Havuzu</Link>
        <ChevronRight size={14} strokeWidth={2} aria-hidden="true" />
        <span aria-current="page">{property.title}</span>
      </nav>

      <div className="dossier">
        <div className="dossier__header">
          <div>
            <h2 className="dossier__name">{property.title}</h2>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <ListingTypeBadge listingType={property.listingType} />
              {canEdit ? (
                <QuickStatusSelect status={property.status} onChange={handleStatusChange} />
              ) : (
                <span className="status-badge" style={{ background: 'var(--cl-border)', color: 'var(--cl-muted)' }}>
                  {property.status === 'active' ? 'Aktif' : property.status}
                </span>
              )}
              <span className="status-badge" style={{ background: 'var(--cl-border)', color: 'var(--cl-text)' }}>
                {typeLabel}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-secondary" onClick={() => setShowShare(true)}>Paylaş</button>
            {canEdit && property.ownerPhone && (
              <button className="btn btn-secondary" onClick={handleSendAuthorization} disabled={sendingAuth} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                {sendingAuth ? 'Hazırlanıyor…' : (<><FileText size={14} /> Yetkilendirme Sözleşmesi Gönder</>)}
              </button>
            )}
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

        {/* Kunye: solda fotograf, saginda bilgiler (ilan sitelerindeki duzen) */}
        <div className="pd-hero">
          <div className="pd-media">
            {fotograflar.length > 0 ? (
              <>
                <button
                  type="button"
                  className="pd-media__main"
                  onClick={() => setLightboxIndex(kapakIndex)}
                  aria-label="Fotoğrafı büyüt"
                >
                  <img src={fotograflar[kapakIndex]} alt={`${property.title} fotoğraf ${kapakIndex + 1}`} />
                  <span className="pd-media__count">{kapakIndex + 1}/{fotograflar.length} Fotoğraf</span>
                </button>
                {fotograflar.length > 1 && (
                  <div className="pd-media__strip">
                    {seritKucukler.map((url, i) => (
                      <button
                        type="button"
                        key={i}
                        className="pd-media__thumb"
                        aria-current={i === kapakIndex}
                        onClick={() => setAnaFoto(i)}
                        aria-label={`${i + 1}. fotoğrafı göster`}
                      >
                        <img src={url} alt="" />
                      </button>
                    ))}
                    {kalanFoto > 0 && (
                      <button
                        type="button"
                        className="pd-media__thumb pd-media__more"
                        onClick={() => setLightboxIndex(seritKucukler.length)}
                        aria-label={`Kalan ${kalanFoto} fotoğrafı göster`}
                      >
                        +{kalanFoto}
                      </button>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="pd-media__main" aria-hidden="true">
                <span className="pd-media__placeholder"><ImageOff size={40} strokeWidth={1.5} /></span>
              </div>
            )}
          </div>

          <div className="pd-spec">
            <div className="pd-spec__price">
              <span className="pd-spec__amount">{priceLabel}</span>
              <span className="pd-spec__place">
                {[property.neighborhood, property.district, property.province].filter(Boolean).join(' / ')}
              </span>
            </div>
            <div className="pd-spec__rows">
              {kunyeSatirlari.map(([etiket, deger]) => (
                <div className="pd-spec__row" key={etiket}>
                  <span className="pd-spec__label">{etiket}</span>
                  <span className="pd-spec__value">{deger}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="dossier__field-grid">
          <div className="dossier__field" style={{ gridColumn: '1 / -1' }}>
            <label>Öne Çıkan Özellikler</label>
            <div>
              {activeFeatures.length ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                  {activeFeatures.map((f) => (
                    <span key={f.key} className="status-badge" style={{ background: 'rgba(21, 154, 99, 0.12)', color: 'var(--cl-success)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Check size={12} /> {f.label}
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

        {matches.length > 0 && (
          <>
            <h3 style={{ fontFamily: 'var(--cl-font-heading)', fontSize: 18, marginBottom: 12, marginTop: 24 }}>
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
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--cl-muted)' }}>
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
