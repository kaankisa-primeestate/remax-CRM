import { apiClient } from './client';

export const tasksApi = {
  list: () => apiClient.get('/tasks').then((r) => r.data),
  create: (payload) => apiClient.post('/tasks', payload).then((r) => r.data),
  update: (id, payload) => apiClient.patch(`/tasks/${id}`, payload).then((r) => r.data),
  remove: (id) => apiClient.delete(`/tasks/${id}`),
};
