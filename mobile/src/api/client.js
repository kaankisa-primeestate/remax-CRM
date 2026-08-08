import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mobil uygulama, tarayıcı proxy'si kullanamaz — doğrudan Render'daki
// canlı backend adresine bağlanır. Kendi backend adresinizi kullanıyorsanız
// bu satırı güncelleyin.
export const API_BASE_URL = 'https://remax-crm-backend.onrender.com/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

// Fotograf/video dosyasini Cloudinary'e yukler, geriye URL doner
export async function uploadFile(fileUri, mimeType) {
  const token = await AsyncStorage.getItem('remax_crm_token');
  if (!token) {
    throw new Error('Token bulunamadi -- oturum acik degil gibi gorunuyor. Cikis yapip tekrar giris deneyin.');
  }
  const formData = new FormData();
  formData.append('file', {
    uri: fileUri,
    type: mimeType || 'image/jpeg',
    name: 'upload.jpg',
  });

  // NOT: Content-Type BASLIGINI ELLE VERMIYORUZ -- fetch, FormData gonderirken
  // gerekli 'boundary' degerini kendisi ekliyor. Elle yazarsak backend
  // dosyayi parcalayamiyor ve yukleme basarisiz oluyor.
  const response = await fetch(`${API_BASE_URL}/upload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    let detail = '';
    try {
      detail = await response.text();
    } catch (e) {
      detail = 'detay alinamadi';
    }
    throw new Error(`Yukleme basarisiz (kod ${response.status}): ${detail}`);
  }

  const data = await response.json();
  return data.url;
}

apiClient.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('remax_crm_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
