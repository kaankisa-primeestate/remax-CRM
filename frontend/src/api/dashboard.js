import { apiClient } from './client';

export const dashboardApi = {
  summary: (params) => apiClient.get('/dashboard/summary', { params }).then((r) => r.data),
};
