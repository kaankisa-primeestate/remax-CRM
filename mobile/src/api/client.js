import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mobil uygulama, tarayıcı proxy'si kullanamaz — doğrudan Render'daki
// canlı backend adresine bağlanır. Kendi backend adresinizi kullanıyorsanız
// bu satırı güncelleyin.
export const API_BASE_URL = 'https://remax-crm-backend.onrender.com/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

apiClient.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('remax_crm_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
