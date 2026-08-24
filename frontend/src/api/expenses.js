import { apiClient } from './client';

export const expensesApi = {
  list: () => apiClient.get('/expenses').then((r) => r.data),
  create: (payload) => apiClient.post('/expenses', payload).then((r) => r.data),
  remove: (id) => apiClient.delete(`/expenses/${id}`),
  getSummary: (from, to) => apiClient.get('/expenses/summary', { params: { from, to } }).then((r) => r.data),
  getCategoryDetail: (category, from, to) =>
    apiClient.get(`/expenses/category/${category}`, { params: { from, to } }).then((r) => r.data),
};

export const EXPENSE_CATEGORIES = [
  { value: 'rent', label: 'Kira' },
  { value: 'utility', label: 'Fatura' },
  { value: 'salary', label: 'Maaş' },
  { value: 'marketing', label: 'Pazarlama' },
  { value: 'supplies', label: 'Ofis Malzemesi' },
  { value: 'other', label: 'Diğer' },
];
