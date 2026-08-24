import { apiClient } from './client';

export const valuationsApi = {
  list: () => apiClient.get('/valuations').then((r) => r.data),
  getOne: (id) => apiClient.get(`/valuations/${id}`).then((r) => r.data),
  prefillFromProperty: (propertyId) => apiClient.get('/valuations/prefill', { params: { propertyId } }).then((r) => r.data),
  create: (payload) => apiClient.post('/valuations', payload).then((r) => r.data),
  update: (id, payload) => apiClient.patch(`/valuations/${id}`, payload).then((r) => r.data),
  remove: (id) => apiClient.delete(`/valuations/${id}`),
  addComp: (id, payload) => apiClient.post(`/valuations/${id}/comps`, payload).then((r) => r.data),
  updateComp: (compId, payload) => apiClient.patch(`/valuations/comps/${compId}`, payload).then((r) => r.data),
  removeComp: (compId) => apiClient.delete(`/valuations/comps/${compId}`),
  downloadPdf: async (id, filenameHint) => {
    const response = await apiClient.get(`/valuations/${id}/pdf`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filenameHint || 'piyasa-analizi'}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};

export const PROPERTY_GROUPS = [
  {
    value: 'residential',
    label: '🏠 Konut',
    description: 'Daire, Villa, Devre Mülk, Yeni Konut Projesi',
    types: [
      { value: 'apartment', label: 'Daire' },
      { value: 'villa', label: 'Villa' },
      { value: 'timeshare', label: 'Devre Mülk' },
      { value: 'project', label: 'Yeni Konut Projesi' },
    ],
  },
  {
    value: 'commercial',
    label: '🏢 Ticari / Gelir Getiren',
    description: 'İşyeri (Fabrika dahil), Plaza / Ofis, Otel',
    types: [
      { value: 'commercial', label: 'İşyeri / Fabrika' },
      { value: 'office', label: 'Plaza / Ofis' },
      { value: 'hotel', label: 'Otel / Turizm Tesisi' },
    ],
  },
  {
    value: 'land',
    label: '🌳 Arazi',
    description: 'Arsa, Tarla',
    types: [
      { value: 'land', label: 'Arsa' },
      { value: 'field', label: 'Tarla' },
    ],
  },
  {
    value: 'mixed',
    label: '🏗️ Karma (Bina)',
    description: 'Komple Bina / Apartman',
    types: [{ value: 'building', label: 'Komple Bina' }],
  },
];

export const PROPERTY_TYPE_LABELS = {
  apartment: 'Daire',
  villa: 'Villa',
  timeshare: 'Devre Mülk',
  project: 'Yeni Konut Projesi',
  commercial: 'İşyeri / Fabrika',
  office: 'Plaza / Ofis',
  hotel: 'Otel / Turizm Tesisi',
  land: 'Arsa',
  field: 'Tarla',
  building: 'Komple Bina',
};

export const COMP_TYPES = [
  { value: 'sold', label: 'Satıldı' },
  { value: 'rented', label: 'Kiralandı' },
  { value: 'active_listing', label: 'Aktif İlan' },
];
