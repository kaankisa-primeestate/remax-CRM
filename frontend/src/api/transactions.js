import { apiClient } from './client';

export const transactionsApi = {
  list: () => apiClient.get('/transactions').then((r) => r.data),
  create: (payload) => apiClient.post('/transactions', payload).then((r) => r.data),
  update: (id, payload) => apiClient.patch(`/transactions/${id}`, payload).then((r) => r.data),
  remove: (id) => apiClient.delete(`/transactions/${id}`),
  getNotes: (id) => apiClient.get(`/transactions/${id}/notes`).then((r) => r.data),
  addNote: (id, text) => apiClient.post(`/transactions/${id}/notes`, { text }).then((r) => r.data),
  getDocuments: (id) => apiClient.get(`/transactions/${id}/documents`).then((r) => r.data),
  addDocument: (id, payload) => apiClient.post(`/transactions/${id}/documents`, payload).then((r) => r.data),
  removeDocument: (documentId) => apiClient.delete(`/transactions/documents/${documentId}`),
  updateSplit: (id, commissionSplitPercentage) =>
    apiClient.patch(`/transactions/${id}/split`, { commissionSplitPercentage }).then((r) => r.data),
  approveSplit: (id) => apiClient.post(`/transactions/${id}/split/approve`).then((r) => r.data),
};

export const TRANSACTION_STAGES = [
  { value: 'lead', label: 'Talep' },
  { value: 'showing', label: 'Gösterme' },
  { value: 'offer', label: 'Teklif' },
  { value: 'deed', label: 'Tapu' },
  { value: 'closed', label: 'Kapanış' },
];

// Backend enum'uyla birebir eşleşir (transaction-document.entity.ts).
// Sabit kontrol listesi kalemleri -- 'other' haric hepsi tekil, sabit bir
// kontrol maddesi temsil eder.
export const TRANSACTION_DOC_TYPES = [
  { value: 'disclosure', label: 'Yer Gösterme Formu' },
  { value: 'contract', label: 'Sözleşme' },
  { value: 'deed', label: 'Tapu' },
  { value: 'id', label: 'Kimlik' },
];
