import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiClient } from '../api/client.js';

const OFFICE_WHATSAPP = '905423781540';
const OFFICE_PHONE_DISPLAY = '+90 542 378 15 40';

const PROPERTY_TYPE_LABELS = {
  apartment: 'Konut',
  land: 'Arsa',
  field: 'Tarla',
  commercial: 'İşyeri',
  timeshare: 'Devre Mülk',
};

export default function PublicPropertyPage() {
  const { id } = useParams();
  const [property, setProperty] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiClient
      .get(`/public/properties/${id}`)
      .then((res) => setProperty(res.data))
      .catch(() => setError('İlan bulunamadı ya da kaldırılmış olabilir.'));
  }, [id]);

  if (error) {
    return (
      <div style={{ maxWidth: 480, margin: '80px auto', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
        {error}
      </div>
    );
  }

  if (!property) {
    return (
      <div style={{ maxWidth: 480, margin: '80px auto', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
        Yükleniyor…
      </div>
    );
  }

  const typeLabel = PROPERTY_TYPE_LABELS[property.propertyType] || property.propertyType;
  const isResidential = property.propertyType === 'apartment' || property.propertyType === 'timeshare';
  const priceLabel = new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: property.priceCurrency || 'TRY',
    maximumFractionDigits: 0,
  }).format(property.price);
  const extras = [
    property.hasPool && 'Havuz',
    property.hasGym && 'Spor Salonu',
    property.hasSecurity && 'Güvenlik',
    property.hasParking && 'Otopark',
  ].filter(Boolean);
  const whatsappHref = `https://wa.me/${OFFICE_WHATSAPP}?text=${encodeURIComponent(
    `Merhaba, "${property.title}" ilanı ile ilgileniyorum (${window.location.href})`,
  )}`;

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, marginBottom: 4 }}>{property.title}</h1>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>
        {property.neighborhood}, {property.district} · {typeLabel} · {property.listingType === 'sale' ? 'Satılık' : 'Kiralık'}
      </div>

      {property.photoUrls && property.photoUrls.length > 0 && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
          {property.photoUrls.map((url, i) => (
            <img
              key={i}
              src={url}
              alt={`${property.title} fotoğraf ${i + 1}`}
              style={{ width: '100%', maxWidth: 340, height: 240, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--paper-line)' }}
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          ))}
        </div>
      )}

      <div style={{ fontSize: 24, fontFamily: 'var(--font-mono)', marginBottom: 20 }}>{priceLabel}</div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 20 }}>
        <div><strong>Metrekare:</strong> {property.areaM2} m²</div>
        {isResidential && (
          <>
            <div><strong>Oda Sayısı:</strong> {property.rooms || '—'}</div>
            <div><strong>Banyo:</strong> {property.bathrooms ?? '—'}</div>
            <div><strong>Kat:</strong> {property.floor || '—'}</div>
            <div><strong>Isıtma:</strong> {property.heatingType || '—'}</div>
            <div><strong>Aidat:</strong> {property.dues ? `₺${property.dues}` : '—'}</div>
            <div><strong>Yapı Yaşı:</strong> {property.buildingAge ?? '—'}</div>
          </>
        )}
        <div><strong>Manzara:</strong> {property.view || '—'}</div>
        <div><strong>Cephe:</strong> {property.facade || '—'}</div>
      </div>

      {extras.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <strong>Ek Özellikler:</strong> {extras.join(', ')}
        </div>
      )}

      <a href={whatsappHref} target="_blank" rel="noreferrer" className="btn" style={{
          display: 'inline-block',
          background: '#25D366',
          color: 'white',
          padding: '12px 24px',
          borderRadius: 8,
          textDecoration: 'none',
          fontWeight: 600,
        }}>
        WhatsApp ile İletişime Geç ({OFFICE_PHONE_DISPLAY})
      </a>
    </div>
  );
}
