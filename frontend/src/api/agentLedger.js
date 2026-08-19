import { apiClient } from './client';

export const agentLedgerApi = {
  getBalance: (agentId) =>
    apiClient.get('/agent-ledger/balance', { params: agentId ? { agentId } : {} }).then((r) => r.data),
  getSummary: () => apiClient.get('/agent-ledger/summary').then((r) => r.data),
  getHistory: (agentId) =>
    apiClient.get('/agent-ledger/history', { params: agentId ? { agentId } : {} }).then((r) => r.data),
  createAdjustment: (payload) => apiClient.post('/agent-ledger/adjustments', payload).then((r) => r.data),
  removeAdjustment: (id) => apiClient.delete(`/agent-ledger/adjustments/${id}`),
  getStatement: (agentId, fromDate, toDate) =>
    apiClient
      .get('/agent-ledger/statement', { params: { agentId, fromDate, toDate } })
      .then((r) => r.data),
};
