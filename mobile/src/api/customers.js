import { apiClient } from './client';

export const customersApi = {
  list: (params) => apiClient.get('/customers', { params }).then((r) => r.data),
  getOne: (id) => apiClient.get(`/customers/${id}`).then((r) => r.data),
  create: (payload) => apiClient.post('/customers', payload).then((r) => r.data),
  listVoiceNotes: (id) => apiClient.get(`/customers/${id}/voice-notes`).then((r) => r.data),
  addVoiceNote: (id, url) =>
    apiClient.post(`/customers/${id}/voice-notes`, { url }).then((r) => r.data),
  removeVoiceNote: (id, voiceNoteId) =>
    apiClient.delete(`/customers/${id}/voice-notes/${voiceNoteId}`),
};

export const CUSTOMER_TYPES = {
  buyer: 'Alıcı',
  seller: 'Satıcı',
  tenant: 'Kiracı',
  landlord: 'Ev Sahibi',
};
