---
tags: [gunluk, tarihce]
---

# Değişiklik Günlüğü

Bu sayfa, projenin son büyük değişikliklerini **kronolojik** olarak listeler. Amaç, "neden şu an böyle" sorusuna hızlı bir tarihçe sunmak. Ayrıntılı teknik gerekçeler için ilgili modül sayfasına bakın.

## Son Büyük Değişiklikler

0. **Muhasebe Raporları, iş odaklı 5 rapora sadeleştirildi** — önceki "Kategori Özeti/Trendi/Hesap Özeti/Günlük Nakit Akışı" görünümleri (kullanıcı tarafından "karışık ve gereksiz" bulundu) kaldırıldı; yerine **Genel Özet, Komisyon Gelirleri, Danışman Aidat/Masa Kirası, Ofis Masraf ve Giderleri, Ortak Cari Hareketleri** raporları geldi. Akış: rapor türü seç → tarih aralığı seç → "Raporu Getir". Hiçbir yeni backend endpoint'i gerekmedi (`getManagementReport` zaten yeterliydi); ayrıca `PARTNER_MOVEMENT_TYPES`'taki bir kategori adı uyuşmazlığı (`'Ortağa Borç Ödemesi'` → `'Ortağa Borç Geri Ödemesi'`) düzeltildi. bkz. [[Modul-Muhasebe]].
1. **Portföy formu genişletildi** — Ada, Parsel, Bağımsız Bölüm No, Sahiplik Oranı, İpotek/Haciz Detayı, İmar/İskan Durumu, Jeneratör, Soğutma, Toplu Taşıma, oda bazında m² dökümü eklendi (Yetkilendirme Sözleşmesi için gerekliydi). bkz. [[Modul-Portfoy]].
2. **Yetkilendirme Sözleşmesi dijital imza akışı** kuruldu — genel, genişletilebilir `digital_documents` sistemi. bkz. [[Modul-Dijital-Belgeler]].
3. **"Sıcak Fırsatlar" eşleştirme motoru tamamen yeniden yazıldı** — Türkçe ek toleranslı algoritma, tüm bilgi tek kelime havuzunda, mahremiyet duvarı düzeltildi (tarama ofis geneli, gösterim kişiye özel), sadece Aktif portföyler dahil. bkz. [[Modul-Esletirme]].
4. **Bildirim yönlendirme düzeltmeleri** — "Onay bekleyen ilan" ve "Portföyünüz onaylandı" bildirimleri ilgili sayfaya yönlendirmeye başladı. bkz. [[Modul-Bildirimler]].
5. **Domain geçişi** — remaxbostanci.com'dan bu-crm.site'e taşındı. bkz. [[Entegrasyon-Cloudflare-Render-GoDaddy]], [[00-Tasarim-Kararlari]].
6. **Yönetici Yönetimi özelliği** — Broker kendi e-postasını değiştirebiliyor, iş ortağı için ayrı bir Broker hesabı ekleyebiliyor. bkz. [[Modul-Kullanicilar-ve-Yetkilendirme]].
7. ~~**Muhasebe Raporları yeniden tasarlandı** — tek seçim kutusuyla 5 rapor türü (Kategori Özeti varsayılan)~~ — **bu tasarım da beğenilmedi ve madde 0'daki iş-odaklı raporlarla değiştirildi.**
8. **Bu wiki (`docs/wiki/`) oluşturuldu** — codebase'den türetilmiş, Obsidian formatında bilgi grafiği.

## Geri Alınan (Revert Edilen) Değişiklikler

- **Portföy Evrak Doğrulama Modülü** (Manus tarafından geliştirilmiş, commit `89d09502`) — bağımsız denetimde backend'in tamamının eksik olduğu, frontend route'unun eklenmediği, yanlış bir API import'u olduğu tespit edildi. `18b1e00a` ile geri alındı. **Bu özellik şu an sistemde yok**, yeniden ele alınmadı.

## Bilinen Eksik/Ertelenmiş İşler

- SMS/OTP iki adımlı doğrulama (Yeni Yönetici Ekle için) — bir SMS sağlayıcısı gerekiyor
- Gerçek SMTP bağlantısı (şifre sıfırlama maili için) — bkz. [[Entegrasyon-WhatsApp-Mail]]
- Danışman menüsündeki "Komisyonlar"/"Aidatlarım"/"Cari Hesabım" sekmelerinin birleştirilmesi — bkz. [[Modul-Diger-Finansal-Kayitlar]]
- `/hukuk`, `/ilan-entegrasyon`, `/ayarlar` sayfaları hâlâ boş/iskelet — bkz. [[00-Sayfa-Haritasi]]
- Portföy Evrak Doğrulama Modülü — geri alındı, henüz yeniden yapılmadı
