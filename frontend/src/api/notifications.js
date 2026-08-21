import { apiClient } from './client';

export const notificationsApi = {
  list: () => apiClient.get('/notifications').then((r) => r.data),
  markSeen: () => apiClient.post('/notifications/mark-seen').then((r) => r.data),
  markRead: (key) => apiClient.post(`/notifications/${key}/read`).then((r) => r.data),
  dismiss: (key) => apiClient.post(`/notifications/${key}/dismiss`).then((r) => r.data),
};
