import { apiClient } from './client';

export const usersApi = {
  listAgents: () => apiClient.get('/users/agents').then((r) => r.data),
  createAgent: (payload) => apiClient.post('/users/agents', payload).then((r) => r.data),
};
