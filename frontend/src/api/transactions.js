import { apiClient } from './client';

export const transactionsApi = {
  list: () => apiClient.get('/transactions').then((r) => r.data),
  create: (payload) => apiClient.post('/transactions', payload).then((r) => r.data),
  update: (id, payload) => apiClient.patch(`/transactions/${id}`, payload).then((r) => r.data),
  remove: (id) => apiClient.delete(`/transactions/${id}`),
};

export const TRANSACTION_STAGES = [
  { value: 'viewing', label: 'Görüşme' },
  { value: 'offer', label: 'Teklif' },
  { value: 'contract', label: 'Sözleşme' },
  { value: 'deed', label: 'Tapu' },
];
