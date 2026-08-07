import axios from 'axios';

// Yerel geliştirmede (npm run dev) vite.config.js'deki proxy sayesinde
// '/api' istekleri otomatik olarak backend'e (port 3000) yönlendirilir.
//
// Netlify gibi bir yere canlıya alındığında proxy diye bir şey olmaz;
// bu yüzden Netlify'da VITE_API_URL adında bir ortam değişkeni tanımlayıp
// (örn: https://remax-crm-backend.onrender.com/api) gerçek backend
// adresini vermeniz gerekir.
const baseURL = import.meta.env.VITE_API_URL || '/api';

export const apiClient = axios.create({
  baseURL,
});

// Her isteğe, giriş yapmışsa JWT token'ı otomatik olarak ekler
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('remax_crm_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Token geçersiz/süresi dolmuşsa (401), oturumu temizleyip giriş sayfasına yönlendirir
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('remax_crm_token');
      localStorage.removeItem('remax_crm_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);
