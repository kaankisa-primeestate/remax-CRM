import { Link } from 'react-router-dom';
import { Phone, Flame } from 'lucide-react';
import { CUSTOMER_TYPES, TIMELINE_LABELS } from '../api/customers';

// Musteri kaydinda fotograf alani yok; bas harflerden rozet uretiyoruz.
function basHarfler(ad, soyad) {
  const harf = (s) => (typeof s === 'string' && s.trim() ? s.trim()[0].toLocaleUpperCase('tr-TR') : '');
  return (harf(ad) + harf(soyad)) || '?';
}

/**
 * Galeri gorunumundeki musteri karti.
 * Listede gorunen dort alan (tur, ad, telefon, butce) burada da var;
 * ustune listede yer olmayan zaman cizelgesi ve bolge tercihi eklenir.
 */
export function CustomerGalleryCard({ customer, butceMetni }) {
  const tur = CUSTOMER_TYPES.find((t) => t.value === customer.type);
  const zaman = TIMELINE_LABELS[customer.purchaseTimeline];
  const acil = customer.purchaseTimeline === 'immediate';
  const bolgeler = Array.isArray(customer.preferredDistricts)
    ? customer.preferredDistricts.filter(Boolean)
    : [];

  return (
    <Link to={`/musteriler/${customer.id}`} className="cus-card">
      <span className="cus-card__head">
        <span className={`cus-card__avatar cus-card__avatar--${customer.type}`} aria-hidden="true">
          {basHarfler(customer.firstName, customer.lastName)}
        </span>
        <span className="cus-card__who">
          <span className="cus-card__name">{customer.firstName} {customer.lastName}</span>
          <span className="cus-card__phone">
            <Phone size={12} strokeWidth={2} aria-hidden="true" /> {customer.phone || '—'}
          </span>
        </span>
      </span>

      <span className="cus-card__badges">
        <span className={`status-badge status-badge--${customer.type}`}>
          {tur?.label || customer.type}
        </span>
        {acil && (
          <span className="pill pill--no">
            <Flame size={12} strokeWidth={2} aria-hidden="true" /> Hemen
          </span>
        )}
      </span>

      <span className="cus-card__rows">
        <span className="cus-card__row">
          <span className="cus-card__label">Bütçe</span>
          <span className="cus-card__value">{butceMetni}</span>
        </span>
        {zaman && !acil && (
          <span className="cus-card__row">
            <span className="cus-card__label">Zaman</span>
            <span className="cus-card__value">{zaman}</span>
          </span>
        )}
        {bolgeler.length > 0 && (
          <span className="cus-card__row">
            <span className="cus-card__label">Bölge</span>
            <span className="cus-card__value">{bolgeler.join(', ')}</span>
          </span>
        )}
      </span>
    </Link>
  );
}
