import { apiClient } from './client';

export const authApi = {
  login: (email, password) =>
    apiClient.post('/auth/login', { email, password }).then((r) => r.data),
  forgotPassword: (email) => apiClient.post('/auth/forgot-password', { email }).then((r) => r.data),
  resetPassword: (email, token, newPassword) =>
    apiClient.post('/auth/reset-password', { email, token, newPassword }).then((r) => r.data),
};

export const usersApi = {
  listAgents: () => apiClient.get('/users/agents').then((r) => r.data),
  getMe: () => apiClient.get('/users/me').then((r) => r.data),
  createAgent: (payload) =>
    apiClient.post('/users/agents', payload).then((r) => r.data),
  changePassword: (payload) =>
    apiClient.patch('/users/change-password', payload).then((r) => r.data),
  setMonthlyTarget: (agentId, monthlyTarget) =>
    apiClient.patch(`/users/agents/${agentId}/target`, { monthlyTarget }).then((r) => r.data),
  setMonthlyDues: (agentId, monthlyDuesAmount) =>
    apiClient.patch(`/users/agents/${agentId}/dues`, { monthlyDuesAmount }).then((r) => r.data),
  updateAgentProfile: (agentId, payload) =>
    apiClient.patch(`/users/agents/${agentId}/profile`, payload).then((r) => r.data),
  brokerResetPassword: (agentId) => apiClient.post(`/users/agents/${agentId}/reset-password`).then((r) => r.data),
  setActive: (agentId, isActive) => apiClient.patch(`/users/agents/${agentId}/active`, { isActive }).then((r) => r.data),
  removeAgent: (agentId) => apiClient.delete(`/users/agents/${agentId}`),
  // Herkese acik (Danisman dahil), sadece isim doner -- Ofis Portfoyu gibi
  // yerlerde "kimin ilani" gostermek icin.
  listAgentRoster: () => apiClient.get('/users/agents/roster').then((r) => r.data),
};
