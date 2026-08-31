import api from './api';

export const ITEM_TYPE_LABELS = {
  identity_deed_check: 'Kimlik ve Tapu Kontrolü',
  authorization_contract: 'Yetkilendirme Sözleşmesi',
  edevlet_authorization: 'E-Devlet İlan Yetkisi',
  listing_published: 'İlan Yasal Sitelerde Yayında',
  commission_partnership: 'Hizmet Ortaklığı / Komisyon Sözleşmesi',
};

export const propertyDocumentsApi = {
  getItems: (propertyId) => api.get(`/properties/${propertyId}/document-items`).then((r) => r.data),
  updateItem: (propertyId, itemType, data) =>
    api.patch(`/properties/${propertyId}/document-items/${itemType}`, data).then((r) => r.data),
  uploadFile: (propertyId, itemType, formData) =>
    api.post(`/properties/${propertyId}/document-items/${itemType}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data),
  getOfficeSummary: (params) =>
    api.get('/properties/document-items/office-summary', { params }).then((r) => r.data),
};
