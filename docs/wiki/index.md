---
tags: [index, primecrm]
---

# PrimeCRM Bilgi Grafiği

RE/MAX Bostancı için geliştirilen emlak danışmanlığı CRM sisteminin canlı, codebase'den türetilmiş bilgi haritası. Bu wiki, her kod değişikliğinden sonra güncellenmelidir — bkz. [[00-Bakim-Talimatlari]].

## Hızlı Erişim

- [[00-Genel-Mimari]] — Teknoloji yığını, hosting, domain, ortamlar
- [[00-Guvenlik-ve-Roller]] — Kimlik doğrulama, roller, yetkilendirme
- [[00-Tasarim-Kararlari]] — Neden bu şekilde yapıldı: kalıcı mimari kararlar
- [[00-Sayfa-Haritasi]] — Frontend route'ları → sayfa → modül eşleşmesi

## Ana İş Modülleri

- [[Modul-Portfoy]] — Mülk (Property) yönetimi, kategori bazlı alanlar, onay akışı
- [[Modul-Musteri]] — Müşteri (Customer) kayıtları, tipler, pipeline
- [[Modul-Islemler]] — İşlem (Transaction) yaşam döngüsü: Lead → Kapanış
- [[Modul-Esletirme]] — "Sıcak Fırsatlar" — müşteri × portföy eşleştirme motoru
- [[Modul-Dijital-Belgeler]] — Yer Gösterme ve Yetkilendirme Sözleşmesi dijital imza akışı
- [[Modul-Muhasebe]] — Muhasebe kayıtları, hesaplar, raporlar
- [[Modul-Komisyon-ve-Hakedis]] — Komisyon hesaplama, işbirlikli satış paylaşımı
- [[Modul-Kullanicilar-ve-Yetkilendirme]] — Broker/Danışman rolleri, hesap yönetimi
- [[Modul-Bildirimler]] — Bildirim zili, tüm bildirim türleri
- [[Modul-Takvim-ve-Randevular]] — Randevular, Yer Gösterme entegrasyonu
- [[Modul-Degerleme]] — Piyasa değer analizi (KPA)
- [[Modul-Gorevler-ve-Duyurular]] — Görevler, ofis duyuruları
- [[Modul-Diger-Finansal-Kayitlar]] — Ortaklar, çek/senet, banka hesapları, danışman aidatları

## Dış Servisler ve Altyapı

- [[Entegrasyon-Cloudflare-Render-GoDaddy]] — Hosting, DNS, domain yönetimi
- [[Entegrasyon-WhatsApp-Mail]] — Dış iletişim kanalları (gerçek API değil, link tabanlı)

## Değişiklik Günlüğü

- bkz. [[00-Degisiklik-Gunlugu]] — Bu wiki'nin ve projenin son büyük değişiklikleri
