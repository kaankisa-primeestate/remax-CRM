import { apiClient } from './client';

export const marketApi = {
  getRealEstateNews: () => apiClient.get('/market/real-estate-news').then((r) => r.data),
};
