import { apiClient } from './client';

export const customersApi = {
  list: (params) => apiClient.get('/customers', { params }).then((r) => r.data),

  getOne: (id) => apiClient.get(`/customers/${id}`).then((r) => r.data),

  create: (payload) => apiClient.post('/customers', payload).then((r) => r.data),

  update: (id, payload) =>
    apiClient.patch(`/customers/${id}`, payload).then((r) => r.data),

  remove: (id) => apiClient.delete(`/customers/${id}`),

  addInteraction: (customerId, payload) =>
    apiClient
      .post(`/customers/${customerId}/interactions`, payload)
      .then((r) => r.data),
  matchingProperties: (customerId) =>
    apiClient.get(`/customers/${customerId}/matching-properties`).then((r) => r.data),
  hotMatches: () => apiClient.get('/hot-matches').then((r) => r.data),
};

// Backend enum'larıyla birebir eşleşir (customer.entity.ts)
// Zaman cizelgesi etiketleri. Ayni degerler CustomerFormModal ve
// QuickAddCustomerModal icinde de tanimli; o iki kopya farkli (biri renk
// tasiyor, biri "Belirtilmedi" secenegi iceriyor) ve calisan formlari
// riske atmamak icin birlestirilmedi. Burasi yalnizca etiket okumak
// isteyen yerler icin ortak kaynak.
export const TIMELINE_LABELS = {
  immediate: 'Hemen',
  '1_3_months': '1–3 ay',
  '3_6_months': '3–6 ay',
  later: 'Daha sonra',
};

export const CUSTOMER_TYPES = [
  { value: 'buyer', label: 'Alıcı' },
  { value: 'seller', label: 'Satıcı' },
  { value: 'tenant', label: 'Kiracı' },
  { value: 'landlord', label: 'Ev Sahibi' },
  { value: 'investor', label: 'Yatırımcı' },
];

// interaction.entity.ts ile birebir eşleşir
export const INTERACTION_TYPES = [
  { value: 'call', label: 'Telefon Görüşmesi' },
  { value: 'meeting', label: 'Yüz Yüze Toplantı' },
  { value: 'message', label: 'Mesajlaşma' },
  { value: 'email', label: 'E-posta' },
];
