import { apiClient } from './client';

export const authApi = {
  login: (email, password) =>
    apiClient.post('/auth/login', { email, password }).then((r) => r.data),
};

export const usersApi = {
  listAgents: () => apiClient.get('/users/agents').then((r) => r.data),
  createAgent: (payload) =>
    apiClient.post('/users/agents', payload).then((r) => r.data),
  changePassword: (payload) =>
    apiClient.patch('/users/change-password', payload).then((r) => r.data),
  setMonthlyTarget: (agentId, monthlyTarget) =>
    apiClient.patch(`/users/agents/${agentId}/target`, { monthlyTarget }).then((r) => r.data),
};
