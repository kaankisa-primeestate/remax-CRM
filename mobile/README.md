# Remax CRM — Mobil Saha Uygulaması (Temel İskelet)

Expo (React Native) ile yazılmış, doğrudan canlı backend'e
(`https://remax-crm-backend.onrender.com/api`) bağlanan mobil uygulama.

## Bu iskelette neler var?

- Giriş ekranı (aynı Broker/Danışman hesaplarıyla)
- Müşteriler sekmesi: arama, liste, detay + görüşme geçmişi (salt okunur)
- Portföyler sekmesi: arama, liste, detay + fotoğraf (salt okunur)
- Aynı Mahremiyet Duvarı: bir Danışman girişte sadece kendi kayıtlarını görür

**Henüz yok (sıradaki adımlar):** Yeni müşteri/portföy ekleme formu, fotoğraf
çekme, sesli not, konum paylaşımı, çevrimdışı çalışma, QR kod. Bunlar brief'in
3.3 "Saha Mobil Uygulaması Özellikleri" bölümünde tarif ediliyor, bu iskelet
üzerine adım adım ekleyebiliriz.

## Kurulum ve Çalıştırma

Bu kurulumu Chromebook'unuzdaki Linux terminalinde yapacaksınız (backend/
frontend'i kurduğunuz gibi).

1. Telefonunuza **Expo Go** uygulamasını App Store / Play Store'dan indirin
   (bunu zaten yaptınız).

2. Terminal'de mobile klasörüne girin ve bağımlılıkları kurun:
   ```bash
   cd mobile
   npm install
   ```

3. Geliştirme sunucusunu başlatın:
   ```bash
   npx expo start --tunnel
   ```
   `--tunnel` seçeneği önemli: Chromebook'un Linux ortamı ile telefonunuz
   aynı yerel ağda görünmeyebilir, tunnel modu bunu bir internet bağlantısı
   üzerinden köprüler.

4. Terminalde bir **QR kod** belirecek. Telefonunuzda Expo Go uygulamasını
   açıp bu QR kodu okutun (Android'de Expo Go içindeki "Scan QR Code",
   iPhone'da doğrudan kamera uygulaması ile de okutabilirsiniz).

5. Uygulama telefonunuzda açılacak. Giriş ekranında web'de kullandığınız
   aynı bilgilerle giriş yapabilirsiniz (örn. `admin@remax.local` / `broker123`
   veya oluşturduğunuz bir danışman hesabı).

## Notlar

- Her kod değişikliğinde uygulama telefonunuzda otomatik yenilenir
  ("Fast Refresh") — Terminal'i açık bırakmanız yeterli.
- Kendi backend adresiniz farklıysa `src/api/client.js` içindeki
  `API_BASE_URL` değerini güncelleyin.
- Bu, "Expo Go" ile bir **önizleme**dir; gerçek App Store/Play Store'a
  yayınlamak için ayrı bir "build" süreci (EAS Build) ve geliştirici
  hesapları gerekir — bu ileride ayrı bir adım olarak ele alınabilir.
