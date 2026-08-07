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
};
export const TRANSACTION_TYPES = {
  sale: 'Satış',
  rent: 'Kiralama',
};
export const COMMISSION_STATUSES = {
  pending: 'Beklemede',
  approved: 'Onaylandı',
  paid: 'Ödendi',
};
