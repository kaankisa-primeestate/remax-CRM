# Remax CRM — Frontend (Müşteri Modülü)

Vite + React ile yazılmış arayüz. "Dosya / kayıt defteri" temalı, backend'deki
Müşteri (CRM) API'sine bağlanır.

## Kurulum

1. Önce `backend` klasöründeki API'yi ayağa kaldırın (bkz. backend/README.md).
2. Bağımlılıkları kurun:
   ```bash
   npm install
   ```
3. Geliştirme sunucusunu başlatın:
   ```bash
   npm run dev
   ```
4. Tarayıcıda açın: `http://localhost:5173`

`vite.config.js` içindeki proxy ayarı sayesinde `/api` istekleri otomatik
olarak `http://localhost:3000`'e (backend) yönlendirilir — ayrıca bir ayar
yapmanıza gerek yok.

## Neler var?

- Müşteri listesi: arama, tipe göre filtreleme (dosya sekmeleri)
- Yeni müşteri ekleme / düzenleme / silme
- Müşteri detay sayfası: tüm bilgiler + görüşme geçmişi zaman çizelgesi
- Görüşme (telefon/toplantı/mesaj/e-posta) kaydı ekleme
