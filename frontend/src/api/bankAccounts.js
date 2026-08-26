import axios from './axios';

export const bankAccountsApi = {
  list: () => axios.get('/bank-accounts').then((r) => r.data),
  getOne: (id) => axios.get(`/bank-accounts/${id}`).then((r) => r.data),
  create: (data) => axios.post('/bank-accounts', data).then((r) => r.data),
  update: (id, data) => axios.put(`/bank-accounts/${id}`, data).then((r) => r.data),
  remove: (id) => axios.delete(`/bank-accounts/${id}`).then((r) => r.data),
  addTransaction: (data) => axios.post('/bank-accounts/transaction', data).then((r) => r.data),
  getHistory: (id) => axios.get(`/bank-accounts/${id}/history`).then((r) => r.data),
  getFinanceSummary: (from, to) =>
    axios.get('/bank-accounts/finance-summary', { params: { from, to } }).then((r) => r.data),
};

export function formatMoney(amount) {
  if (amount == null) return '0 ₺';
  return Number(amount).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₺';
}
