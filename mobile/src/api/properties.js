import { apiClient } from './client';

export const propertiesApi = {
  list: (params) => apiClient.get('/properties', { params }).then((r) => r.data),
  getOne: (id) => apiClient.get(`/properties/${id}`).then((r) => r.data),
  create: (payload) => apiClient.post('/properties', payload).then((r) => r.data),
};

export const PROPERTY_TYPES = {
  apartment: 'Konut',
  land: 'Arsa',
  field: 'Tarla',
  commercial: 'İşyeri',
  timeshare: 'Devre Mülk',
};

export const LISTING_TYPES = {
  sale: 'Satılık',
  rent: 'Kiralık',
};

export const PROPERTY_STATUSES = {
  active: 'Aktif',
  passive: 'Pasif',
  sold: 'Satıldı',
  rented: 'Kiralandı',
};
