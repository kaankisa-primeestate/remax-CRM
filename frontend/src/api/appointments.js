import { apiClient } from './client';

export const appointmentsApi = {
  list: () => apiClient.get('/appointments').then((r) => r.data),
  create: (payload) => apiClient.post('/appointments', payload).then((r) => r.data),
  update: (id, payload) => apiClient.patch(`/appointments/${id}`, payload).then((r) => r.data),
  remove: (id) => apiClient.delete(`/appointments/${id}`),
};

export const APPOINTMENT_TYPES = [
  { value: 'meeting', label: 'Müşteri Görüşmesi', icon: '💬' },
  { value: 'showing', label: 'İlan Gösterimi', icon: '🏠' },
  { value: 'other', label: 'Diğer', icon: '📌' },
];
