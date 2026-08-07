import { apiClient } from './client';

export const authApi = {
  login: (email, password) =>
    apiClient.post('/auth/login', { email, password }).then((r) => r.data),
};
