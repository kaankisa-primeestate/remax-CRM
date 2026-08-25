import { apiClient } from './client';

export const bankAccountsApi = {
  list: (includeInactive = false) =>
    apiClient.get('/bank-accounts', { params: { includeInactive } }).then((r) => r.data),
  create: (payload) => apiClient.post('/bank-accounts', payload).then((r) => r.data),
  setActive: (id, isActive) =>
    apiClient.patch(`/bank-accounts/${id}/active`, { isActive }).then((r) => r.data),
  listTransactions: (accountId) =>
    apiClient.get(`/bank-accounts/${accountId}/transactions`).then((r) => r.data),
  addTransaction: (accountId, payload) =>
    apiClient.post(`/bank-accounts/${accountId}/transactions`, payload).then((r) => r.data),
  removeTransaction: (transactionId) =>
    apiClient.delete(`/bank-accounts/transactions/${transactionId}`),
};

export const CURRENCIES = [
  { value: 'TRY', label: '₺ TRY' },
  { value: 'USD', label: '$ USD' },
  { value: 'EUR', label: '€ EUR' },
];

export const ACCOUNT_TYPES = [
  { value: 'cash', label: 'Kasa (Nakit)', icon: '💵' },
  { value: 'bank', label: 'Banka Hesabı', icon: '🏦' },
  { value: 'credit_card', label: 'Kredi Kartı', icon: '💳' },
];

const CURRENCY_SYMBOLS = { TRY: '₺', USD: '$', EUR: '€' };

export function formatMoney(amount, currency = 'TRY') {
  const symbol = CURRENCY_SYMBOLS[currency] || currency;
  const formatted = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(amount || 0);
  return `${symbol}${formatted}`;
}
