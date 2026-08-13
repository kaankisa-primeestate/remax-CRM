import { apiClient } from './client';

export const notificationsApi = {
  list: () => apiClient.get('/notifications').then((r) => r.data),
  markSeen: () => apiClient.post('/notifications/mark-seen').then((r) => r.data),
};
