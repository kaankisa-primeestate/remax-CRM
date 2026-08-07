import { apiClient } from './client';

export const customersApi = {
  list: (params) => apiClient.get('/customers', { params }).then((r) => r.data),
  getOne: (id) => apiClient.get(`/customers/${id}`).then((r) => r.data),
  create: (payload) => apiClient.post('/customers', payload).then((r) => r.data),
};

export const CUSTOMER_TYPES = {
  buyer: 'Alıcı',
  seller: 'Satıcı',
  tenant: 'Kiracı',
  landlord: 'Ev Sahibi',
};
