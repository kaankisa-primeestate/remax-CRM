import { apiClient } from './client';

export const expensesApi = {
  list: () => apiClient.get('/expenses').then((r) => r.data),
  create: (payload) => apiClient.post('/expenses', payload).then((r) => r.data),
  remove: (id) => apiClient.delete(`/expenses/${id}`),
  getSummary: (from, to) => apiClient.get('/expenses/summary', { params: { from, to } }).then((r) => r.data),
  getCategoryDetail: (categoryId, from, to) =>
    apiClient.get(`/expenses/category/${categoryId}`, { params: { from, to } }).then((r) => r.data),
  // YENI, serbest kategori sistemi -- artik sabit bir liste degil,
  // kullanici kendi kategorilerini ekleyip yonetebiliyor.
  listCategories: () => apiClient.get('/expenses/categories').then((r) => r.data),
  createCategory: (name) => apiClient.post('/expenses/categories', { name }).then((r) => r.data),
  deactivateCategory: (id) => apiClient.delete(`/expenses/categories/${id}`),
};
