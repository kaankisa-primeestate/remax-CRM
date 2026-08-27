import { apiClient } from './client';

export const ACCOUNTING_CURRENCIES = [
  { value: 'TRY', label: 'TL', symbol: '₺' },
  { value: 'EUR', label: 'EUR', symbol: '€' },
  { value: 'USD', label: 'USD', symbol: '$' },
];

export const ACCOUNTING_PARTY_TYPES = [
  { value: 'partner', label: 'Ortak' },
  { value: 'customer', label: 'Müşteri' },
  { value: 'vendor', label: 'Tedarikçi' },
  { value: 'other', label: 'Diğer' },
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
  updateAccount: (id, payload) => apiClient.patch(`/accounting/accounts/${id}`, payload).then((response) => response.data),
  archiveAccount: (id, payload) => apiClient.post(`/accounting/accounts/${id}/archive`, payload).then((response) => response.data),
  listEntries: (params = {}) => apiClient.get('/accounting/entries', { params }).then((response) => response.data),
  createEntry: (payload) => apiClient.post('/accounting/entries', payload).then((response) => response.data),
  voidEntry: (id, payload) => apiClient.post(`/accounting/entries/${id}/void`, payload).then((response) => response.data),
  correctEntry: (id, payload) => apiClient.post(`/accounting/entries/${id}/correct`, payload).then((response) => response.data),
  getSummary: (params = {}) => apiClient.get('/accounting/summary', { params }).then((response) => response.data),
  getManagementReport: (params = {}) => apiClient.get('/accounting/reports/management', { params }).then((response) => response.data),
  getMigrationPreview: () => apiClient.get('/accounting/migration/preview').then((response) => response.data),
  listAuditLogs: (params = {}) => apiClient.get('/accounting/audit-logs', { params }).then((response) => response.data),
  listCommissions: () => apiClient.get('/accounting/commissions').then((response) => response.data),
  createCommission: (payload) => apiClient.post('/accounting/commissions', payload).then((response) => response.data),
  collectCommission: (id, payload) => apiClient.post(`/accounting/commissions/${id}/collect`, payload).then((response) => response.data),
  payCommission: (id, payload) => apiClient.post(`/accounting/commissions/${id}/pay`, payload).then((response) => response.data),
  voidCommission: (id, payload) => apiClient.post(`/accounting/commissions/${id}/void`, payload).then((response) => response.data),
  listRents: (params = {}) => apiClient.get('/accounting/rents', { params }).then((response) => response.data),
  generateRents: (payload) => apiClient.post('/accounting/rents/generate', payload).then((response) => response.data),
  collectRent: (id, payload) => apiClient.post(`/accounting/rents/${id}/collect`, payload).then((response) => response.data),
  voidRent: (id, payload) => apiClient.post(`/accounting/rents/${id}/void`, payload).then((response) => response.data),
  listParties: (params = {}) => apiClient.get('/accounting/parties', { params }).then((response) => response.data),
  createParty: (payload) => apiClient.post('/accounting/parties', payload).then((response) => response.data),
  updateParty: (id, payload) => apiClient.patch(`/accounting/parties/${id}`, payload).then((response) => response.data),
  archiveParty: (id, payload) => apiClient.post(`/accounting/parties/${id}/archive`, payload).then((response) => response.data),
  listPartyEntries: (id) => apiClient.get(`/accounting/parties/${id}/entries`).then((response) => response.data),
  listCategories: (params = {}) => apiClient.get('/accounting/categories', { params }).then((response) => response.data),
  createCategory: (payload) => apiClient.post('/accounting/categories', payload).then((response) => response.data),
  archiveCategory: (id, payload) => apiClient.post(`/accounting/categories/${id}/archive`, payload).then((response) => response.data),
  listRecurringExpenses: (params = {}) => apiClient.get('/accounting/recurring-expenses', { params }).then((response) => response.data),
  createRecurringExpense: (payload) => apiClient.post('/accounting/recurring-expenses', payload).then((response) => response.data),
  updateRecurringExpense: (id, payload) => apiClient.patch(`/accounting/recurring-expenses/${id}`, payload).then((response) => response.data),
  archiveRecurringExpense: (id, payload) => apiClient.post(`/accounting/recurring-expenses/${id}/archive`, payload).then((response) => response.data),
  generateRecurringExpenses: (payload) => apiClient.post('/accounting/recurring-expenses/generate', payload).then((response) => response.data),
};

export function formatAccountingMoney(amount, currency = 'TRY') {
  const currencyInfo = ACCOUNTING_CURRENCIES.find((item) => item.value === currency);
  const symbol = currencyInfo?.symbol || currency;
  return `${Number(amount || 0).toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${symbol}`;
}
