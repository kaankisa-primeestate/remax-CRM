import { apiClient } from './client';
export const authApi = {
  login: (email, password) =>
    apiClient.post('/auth/login', { email, password }).then((r) => r.data),
  changePassword: (payload) =>
    apiClient.patch('/users/change-password', payload).then((r) => r.data),
};
