import { apiClient } from './client';

export const agentDuesApi = {
  list: () => apiClient.get('/agent-dues').then((r) => r.data),
  generate: (period) => apiClient.post('/agent-dues/generate', { period }).then((r) => r.data),
  markPaid: (id, payload) => apiClient.patch(`/agent-dues/${id}/paid`, payload).then((r) => r.data),
  remove: (id) => apiClient.delete(`/agent-dues/${id}`),
};

export function currentPeriod() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function periodLabel(period) {
  const [year, month] = period.split('-');
  const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  return `${months[Number(month) - 1]} ${year}`;
}
