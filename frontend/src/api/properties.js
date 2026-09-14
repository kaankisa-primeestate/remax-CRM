import { apiClient } from './client';

export const propertiesApi = {
  list: (params) => apiClient.get('/properties', { params }).then((r) => r.data),
  getOne: (id) => apiClient.get(`/properties/${id}`).then((r) => r.data),
  create: (payload) => apiClient.post('/properties', payload).then((r) => r.data),
  update: (id, payload) =>
    apiClient.patch(`/properties/${id}`, payload).then((r) => r.data),
  remove: (id) => apiClient.delete(`/properties/${id}`),
  matchingCustomers: (id) =>
    apiClient.get(`/properties/${id}/matching-customers`).then((r) => r.data),
};

// Backend enum'larıyla birebir eşleşir (property.entity.ts)
export const PROPERTY_TYPES = [
  { value: 'apartment', label: 'Konut' },
  { value: 'land', label: 'Arsa' },
  { value: 'field', label: 'Tarla' },
  { value: 'commercial', label: 'İşyeri' },
  { value: 'timeshare', label: 'Devre Mülk' },
  { value: 'villa', label: 'Villa' },
  { value: 'office', label: 'Plaza / Ofis' },
  { value: 'building', label: 'Komple Bina' },
  { value: 'project', label: 'Yeni Konut Projesi' },
  { value: 'hotel', label: 'Otel / Turizm Tesisi' },
];

export const LISTING_TYPES = [
  { value: 'sale', label: 'Satılık' },
  { value: 'rent', label: 'Kiralık' },
];

/**
 * Portfoy fiyatini ekranda gosterilecek metne cevirir.
 *
 * Kiralik ilanlarda tutarin sonuna "kira" eklenir: listede ve galeride
 * ust uste gelen "8.500.000" (satilik) ile "145.000" (kiralik) ayni
 * bicimde goruntuyordu, hangisinin ne oldugu okunmuyordu.
 */
export function formatPropertyPrice(property) {
  if (!property || property.price == null || property.price === '') return '—';
  const tutar = new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: property.priceCurrency || 'TRY',
    maximumFractionDigits: 0,
  }).format(property.price);
  return property.listingType === 'rent' ? `${tutar} kira` : tutar;
}

export const PROPERTY_STATUSES = [
  { value: 'pending_approval', label: 'Onay Bekliyor' },
  { value: 'needs_revision', label: 'Revizyon Gerekli' },
  { value: 'active', label: 'Aktif' },
  { value: 'passive', label: 'Pasif' },
  { value: 'sold', label: 'Satıldı' },
  { value: 'rented', label: 'Kiralandı' },
];
