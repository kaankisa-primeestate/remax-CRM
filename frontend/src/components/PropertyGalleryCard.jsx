import { Link } from 'react-router-dom';
import { ImageOff } from 'lucide-react';
import { PROPERTY_STATUSES } from '../api/properties';
import { ListingTypeBadge } from './PropertyStatusBadge.jsx';
import { thumbUrl, coverPhoto } from '../utils/image';

// Durum -> rozet tonu. Degerler PROPERTY_STATUSES ile birebir.
const DURUM_TONU = {
  active: 'ok',
  sold: 'ok',
  rented: 'ok',
  pending_approval: 'wait',
  needs_revision: 'wait',
  passive: 'no',
};

/**
 * Galeri gorunumundeki portfoy karti.
 * Fotograf yoksa, mulk turune gore ikonlu bir yer tutucu gosterilir --
 * bos gri kutu birakilmaz.
 */
export function PropertyGalleryCard({ property, TurIkonu, fiyatMetni, sahipAdi }) {
  const kapak = coverPhoto(property);
  const durum = PROPERTY_STATUSES.find((s) => s.value === property.status);
  const ton = DURUM_TONU[property.status] || 'wait';
  const Ikon = TurIkonu || ImageOff;

  return (
    <Link to={`/portfoyler/${property.id}`} className="gal-card">
      <div className="gal-card__media">
        {kapak ? (
          <img
            src={thumbUrl(kapak, 400, 300)}
            alt=""
            loading="lazy"
            decoding="async"
            className="gal-card__img"
          />
        ) : (
          <span className="gal-card__placeholder" aria-hidden="true">
            <Ikon size={36} strokeWidth={1.5} />
          </span>
        )}
        <span className="gal-card__badges">
          <ListingTypeBadge listingType={property.listingType} />
          <span className={`pill pill--${ton}`}>{durum?.label || property.status}</span>
        </span>
      </div>

      <div className="gal-card__body">
        <span className="gal-card__title">{property.title}</span>
        <span className="gal-card__place">
          {[property.district, property.city].filter(Boolean).join(' / ') || '—'}
        </span>
        <span className="gal-card__specs">
          {property.areaSqm ? <span>{property.areaSqm} m²</span> : null}
          {property.roomCount ? <span>{property.roomCount}</span> : null}
          {sahipAdi ? <span>{sahipAdi}</span> : null}
        </span>
        <span className="gal-card__foot">
          <span className="gal-card__price">{fiyatMetni}</span>
        </span>
      </div>
    </Link>
  );
}
