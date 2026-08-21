import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Frontend'den /api ile başlayan istekler backend'e yönlendirilir
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Vendor kutuphanelerini (react, react-dom, react-router-dom) uygulama
        // kodundan AYRI bir dosyada tutuyoruz -- bunlar cok nadir degisir,
        // boylece tarayici bu dosyayi uzun sure onbellekte tutabilir ve
        // sonraki her deploy'da SADECE uygulama kodunu (kucuk dosya)
        // yeniden indirir. Davranista hicbir degisiklik yok, sadece
        // yukleme performansi ve "500KB uzeri" uyarisi icin.
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
});
