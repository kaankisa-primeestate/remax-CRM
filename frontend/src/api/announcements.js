import { apiClient } from './client';

export const announcementsApi = {
  list: (includeDismissed = false) =>
    apiClient.get('/announcements', { params: includeDismissed ? { includeDismissed: 'true' } : {} }).then((r) => r.data),
  create: (payload) => apiClient.post('/announcements', payload).then((r) => r.data),
  remove: (id) => apiClient.delete(`/announcements/${id}`),
  respond: (id, payload) => apiClient.post(`/announcements/${id}/respond`, payload).then((r) => r.data),
  markRead: (id) => apiClient.post(`/announcements/${id}/read`).then((r) => r.data),
  dismiss: (id) => apiClient.post(`/announcements/${id}/dismiss`).then((r) => r.data),
  getReadStatus: (id) => apiClient.get(`/announcements/${id}/read-status`).then((r) => r.data),
};
