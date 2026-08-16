import { apiClient } from './client';
export const commissionsApi = {
  list: (params) => apiClient.get('/commissions', { params }).then((r) => r.data),
  getOne: (id) => apiClient.get(`/commissions/${id}`).then((r) => r.data),
  create: (payload) => apiClient.post('/commissions', payload).then((r) => r.data),
  update: (id, payload) =>
    apiClient.patch(`/commissions/${id}`, payload).then((r) => r.data),
  remove: (id) => apiClient.delete(`/commissions/${id}`),
  summary: (params) =>
    apiClient.get('/commissions/summary', { params }).then((r) => r.data),
  getPayments: (id) => apiClient.get(`/commissions/${id}/payments`).then((r) => r.data),
  addPayment: (id, payload) => apiClient.post(`/commissions/${id}/payments`, payload).then((r) => r.data),
  removePayment: (paymentId) => apiClient.delete(`/commissions/payments/${paymentId}`),
};
// Backend enum'larıyla birebir eşleşir (commission.entity.ts)
export const TRANSACTION_TYPES = [
  { value: 'sale', label: 'Satış' },
  { value: 'rent', label: 'Kiralama' },
];
export const COMMISSION_STATUSES = [
  { value: 'pending', label: 'Beklemede' },
  { value: 'approved', label: 'Onaylandı' },
  { value: 'paid', label: 'Ödendi' },
];
