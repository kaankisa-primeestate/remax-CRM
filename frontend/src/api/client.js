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
