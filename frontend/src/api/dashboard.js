import { apiClient } from './client';

export const dashboardApi = {
  summary: (params) => apiClient.get('/dashboard/summary', { params }).then((r) => r.data),
  myTarget: () => apiClient.get('/dashboard/my-target').then((r) => r.data),
};
