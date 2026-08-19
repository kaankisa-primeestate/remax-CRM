import { apiClient } from './client';

export const recurringExpensesApi = {
  list: () => apiClient.get('/recurring-expenses').then((r) => r.data),
  create: (payload) => apiClient.post('/recurring-expenses', payload).then((r) => r.data),
  update: (id, payload) => apiClient.patch(`/recurring-expenses/${id}`, payload).then((r) => r.data),
  remove: (id) => apiClient.delete(`/recurring-expenses/${id}`),
  getPending: (period) => apiClient.get('/recurring-expenses/pending', { params: { period } }).then((r) => r.data),
  pay: (id, payload) => apiClient.post(`/recurring-expenses/${id}/pay`, payload).then((r) => r.data),
};
