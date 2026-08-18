import { apiClient } from './client';

export const valuationsApi = {
  list: () => apiClient.get('/valuations').then((r) => r.data),
  create: (payload) => apiClient.post('/valuations', payload).then((r) => r.data),
  get: (id) => apiClient.get(`/valuations/${id}`).then((r) => r.data),
  update: (id, payload) => apiClient.patch(`/valuations/${id}`, payload).then((r) => r.data),
  remove: (id) => apiClient.delete(`/valuations/${id}`),
  rematch: (id) => apiClient.post(`/valuations/${id}/rematch`).then((r) => r.data),
  addComp: (id, payload) => apiClient.post(`/valuations/${id}/comps`, payload).then((r) => r.data),
  updateComp: (compId, payload) => apiClient.patch(`/valuations/comps/${compId}`, payload).then((r) => r.data),
  removeComp: (compId) => apiClient.delete(`/valuations/comps/${compId}`),
  // PDF blob olarak iner, tarayicida otomatik indirme tetiklenir.
  downloadPdf: async (id, filenameHint) => {
    const response = await apiClient.get(`/valuations/${id}/pdf`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filenameHint || 'piyasa-analizi'}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};

export const COMP_TYPES = [
  { value: 'sold', label: 'Satıldı' },
  { value: 'rented', label: 'Kiralandı' },
  { value: 'active_listing', label: 'Aktif İlan (henüz satılmadı)' },
];

export const VALUATION_STATUSES = [
  { value: 'draft', label: 'Taslak' },
  { value: 'completed', label: 'Tamamlandı' },
];
