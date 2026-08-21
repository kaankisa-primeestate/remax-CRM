import { apiClient } from './client';

export const calendarApi = {
  getEvents: (from, to) => apiClient.get('/calendar/events', { params: { from, to } }).then((r) => r.data),
};

export const CALENDAR_EVENT_COLORS = {
  appointment: { bg: '#eef3f9', fg: '#1f3a5f' },
  task: { bg: '#fdf3e0', fg: '#8a6100' },
  transaction_showing: { bg: '#e6f4ea', fg: '#1e7a3d' },
  offer_validity: { bg: '#fbeeeb', fg: '#b3261e' },
  commission_due: { bg: '#f3ecf9', fg: '#6b3fa0' },
  agent_due: { bg: '#eef3f9', fg: '#1f3a5f' },
  contract_end: { bg: '#fbeeeb', fg: '#b3261e' },
};

export const CALENDAR_EVENT_CATEGORIES = [
  { key: 'appointment', label: 'Randevular' },
  { key: 'task', label: 'Görevler' },
  { key: 'transaction_showing', label: 'İşlem Tarihleri', includes: ['transaction_showing', 'offer_validity'] },
  { key: 'commission_due', label: 'Finansal Vadeler', includes: ['commission_due', 'agent_due'] },
  { key: 'contract_end', label: 'Sözleşme Bitişleri' },
];
