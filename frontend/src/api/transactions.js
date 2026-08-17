import { apiClient } from './client';

export const transactionsApi = {
  list: () => apiClient.get('/transactions').then((r) => r.data),
  create: (payload) => apiClient.post('/transactions', payload).then((r) => r.data),
  update: (id, payload) => apiClient.patch(`/transactions/${id}`, payload).then((r) => r.data),
  remove: (id) => apiClient.delete(`/transactions/${id}`),
  getNotes: (id) => apiClient.get(`/transactions/${id}/notes`).then((r) => r.data),
  addNote: (id, text) => apiClient.post(`/transactions/${id}/notes`, { text }).then((r) => r.data),
};

export const TRANSACTION_STAGES = [
  { value: 'lead', label: 'Talep' },
  { value: 'showing', label: 'Gösterme' },
  { value: 'offer', label: 'Teklif' },
  { value: 'deed', label: 'Tapu' },
  { value: 'closed', label: 'Kapanış' },
];
