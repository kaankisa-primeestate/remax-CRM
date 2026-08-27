import { apiClient } from './client';

export const ACCOUNTING_CURRENCIES = [
  { value: 'TRY', label: 'TL', symbol: '₺' },
  { value: 'EUR', label: 'EUR', symbol: '€' },
  { value: 'USD', label: 'USD', symbol: '$' },
];

export const ACCOUNTING_ACCOUNT_TYPES = [
  { value: 'bank', label: 'Banka' },
  { value: 'cash', label: 'Kasa' },
  { value: 'credit_card', label: 'Kredi Kartı' },
];

export const ACCOUNTING_ENTRY_TYPES = [
  { value: 'income', label: 'Gelir / Tahsilat' },
  { value: 'expense', label: 'Gider / Ödeme' },
  { value: 'transfer', label: 'Hesaplar Arası Transfer' },
];

export const accountingApi = {
  listAccounts: () => apiClient.get('/accounting/accounts').then((response) => response.data),
  createAccount: (payload) => apiClient.post('/accounting/accounts', payload).then((response) => response.data),
  listEntries: (params = {}) => apiClient.get('/accounting/entries', { params }).then((response) => response.data),
  createEntry: (payload) => apiClient.post('/accounting/entries', payload).then((response) => response.data),
  getSummary: (params = {}) => apiClient.get('/accounting/summary', { params }).then((response) => response.data),
  listCommissions: () => apiClient.get('/accounting/commissions').then((response) => response.data),
  createCommission: (payload) => apiClient.post('/accounting/commissions', payload).then((response) => response.data),
  collectCommission: (id, payload) => apiClient.post(`/accounting/commissions/${id}/collect`, payload).then((response) => response.data),
  payCommission: (id, payload) => apiClient.post(`/accounting/commissions/${id}/pay`, payload).then((response) => response.data),
};

export function formatAccountingMoney(amount, currency = 'TRY') {
  const currencyInfo = ACCOUNTING_CURRENCIES.find((item) => item.value === currency);
  const symbol = currencyInfo?.symbol || currency;
  return `${Number(amount || 0).toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${symbol}`;
}
