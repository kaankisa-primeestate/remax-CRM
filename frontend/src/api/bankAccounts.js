import axios from './axios';

export const CURRENCIES = [
  { value: 'TRY', label: 'TL' },
  { value: 'USD', label: 'USD' },
  { value: 'EUR', label: 'EUR' },
];

export const ACCOUNT_TYPES = [
  { value: 'bank', label: 'Banka', icon: '🏦' },
  { value: 'cash', label: 'Kasa', icon: '💵' },
  { value: 'credit_card', label: 'Kredi Kartı', icon: '💳' },
];

export const bankAccountsApi = {
  list: () => axios.get('/bank-accounts').then((r) => r.data),
  getOne: (id) => axios.get(`/bank-accounts/${id}`).then((r) => r.data),
  create: (data) => axios.post('/bank-accounts', data).then((r) => r.data),
  update: (id, data) => axios.put(`/bank-accounts/${id}`, data).then((r) => r.data),
  setActive: (id, isActive) => axios.put(`/bank-accounts/${id}`, { isActive }).then((r) => r.data),
  remove: (id) => axios.delete(`/bank-accounts/${id}`).then((r) => r.data),
  addTransaction: (bankAccountId, data) =>
    axios.post('/bank-accounts/transaction', { ...data, bankAccountId }).then((r) => r.data),
  listTransactions: (id) => axios.get(`/bank-accounts/${id}/history`).then((r) => r.data),
  getHistory: (id) => axios.get(`/bank-accounts/${id}/history`).then((r) => r.data),
  getFinanceSummary: (from, to) =>
    axios.get('/bank-accounts/finance-summary', { params: { from, to } }).then((r) => r.data),
};

export function formatMoney(amount, currency = 'TRY') {
  if (amount == null) return `0 ${currency === 'TRY' ? '₺' : currency}`;
  const formatted = Number(amount).toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${formatted} ${currency === 'TRY' ? '₺' : currency}`;
}
