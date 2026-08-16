import { apiClient } from './client';

export const announcementsApi = {
  list: () => apiClient.get('/announcements').then((r) => r.data),
  create: (payload) => apiClient.post('/announcements', payload).then((r) => r.data),
  remove: (id) => apiClient.delete(`/announcements/${id}`),
  respond: (id, payload) => apiClient.post(`/announcements/${id}/respond`, payload).then((r) => r.data),
};
