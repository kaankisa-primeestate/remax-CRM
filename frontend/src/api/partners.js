import { apiClient } from './client';

export const partnersApi = {
  list: () => apiClient.get('/partners').then((r) => r.data),
  create: (payload) => apiClient.post('/partners', payload).then((r) => r.data),
  update: (id, payload) => apiClient.patch(`/partners/${id}`, payload).then((r) => r.data),
  remove: (id) => apiClient.delete(`/partners/${id}`),
  getSummary: () => apiClient.get('/partners/summary').then((r) => r.data),
  getHistory: (id) => apiClient.get(`/partners/${id}/history`).then((r) => r.data),
  addAdjustment: (id, payload) => apiClient.post(`/partners/${id}/adjustments`, payload).then((r) => r.data),
  removeAdjustment: (entryId) => apiClient.delete(`/partners/adjustments/${entryId}`),
  distributeProfit: (payload) => apiClient.post('/partners/distribute-profit', payload).then((r) => r.data),
};
