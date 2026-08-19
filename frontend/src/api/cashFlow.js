import { apiClient } from './client';

export const cashFlowApi = {
  getForecast: () => apiClient.get('/cash-flow/forecast').then((r) => r.data),
};
