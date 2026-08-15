import { apiClient } from './client';

export const propertyCommentsApi = {
  list: (propertyId) => apiClient.get(`/properties/${propertyId}/comments`).then((r) => r.data),
  create: (propertyId, message) =>
    apiClient.post(`/properties/${propertyId}/comments`, { message }).then((r) => r.data),
};
