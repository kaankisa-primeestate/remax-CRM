import { apiClient } from './client';

export const chequeNotesApi = {
  list: () => apiClient.get('/cheque-notes').then((r) => r.data),
  create: (payload) => apiClient.post('/cheque-notes', payload).then((r) => r.data),
  update: (id, payload) => apiClient.patch(`/cheque-notes/${id}`, payload).then((r) => r.data),
  remove: (id) => apiClient.delete(`/cheque-notes/${id}`),
};

export const CHEQUE_NOTE_TYPES = [
  { value: 'cheque', label: 'Çek' },
  { value: 'note', label: 'Senet' },
];

export const CHEQUE_NOTE_DIRECTIONS = [
  { value: 'receivable', label: 'Alacak (bize ödenecek)' },
  { value: 'payable', label: 'Borç (bizim ödeyeceğimiz)' },
];

export const CHEQUE_NOTE_STATUSES = [
  { value: 'portfolio', label: 'Portföyde Bekliyor' },
  { value: 'collected', label: 'Tahsil Edildi / Ödendi' },
  { value: 'endorsed', label: 'Ciro Edildi' },
  { value: 'bounced', label: 'Karşılıksız' },
];
