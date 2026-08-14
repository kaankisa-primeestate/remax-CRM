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
};

// Backend enum'larıyla birebir eşleşir (customer.entity.ts)
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
