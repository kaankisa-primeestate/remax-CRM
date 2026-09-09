---
tags: [gunluk, tarihce]
---

# Değişiklik Günlüğü

Bu sayfa, projenin son büyük değişikliklerini **kronolojik** olarak listeler. Amaç, "neden şu an böyle" sorusuna hızlı bir tarihçe sunmak. Ayrıntılı teknik gerekçeler için ilgili modül sayfasına bakın.

## Son Büyük Değişiklikler

0. **Muhasebe Raporları, ekranda sadece 3 buton + "Getir" gösterecek şekilde sadeleştirildi** — bir önceki sürümde 2026-09-08'de yapılan "3 kutu" tasarımı da hâlâ kalabalık bulundu (5 rapor türü + 8 tarih preset'i hep açık duruyordu); şimdi her buton tıklanınca kendi panelini açıyor, kapalıyken sadece seçili değeri gösteriyor (`openReportBox` state'i). 2. butondaki arama artık ayrı bir `SearchableSelect` bileşeni değil, panelin kendi içinde. "Getir"e basılana kadar sonuç değişmiyor (`appliedReportType`/`appliedReportSubFilter`). Ayrıca, aynı işi yapmaya çalışan ama hiçbir route'a bağlı olmayan, sahte veriyle çalışan `frontend/src/pages/ReportsPage.jsx` dosyası (2026-09-07'de yanlışlıkla/deneme amaçlı eklenmişti) silindi. bkz. [[Modul-Muhasebe]].
1. ~~**Muhasebe Raporları, iş odaklı 5 rapora sadeleştirildi**~~ — bkz. madde 0 (üstteki), bu da yeniden tasarlandı.
2. **Portföy formu genişletildi** — Ada, Parsel, Bağımsız Bölüm No, Sahiplik Oranı, İpotek/Haciz Detayı, İmar/İskan Durumu, Jeneratör, Soğutma, Toplu Taşıma, oda bazında m² dökümü eklendi (Yetkilendirme Sözleşmesi için gerekliydi). bkz. [[Modul-Portfoy]].
3. **Yetkilendirme Sözleşmesi dijital imza akışı** kuruldu — genel, genişletilebilir `digital_documents` sistemi. bkz. [[Modul-Dijital-Belgeler]].
4. **"Sıcak Fırsatlar" eşleştirme motoru tamamen yeniden yazıldı** — Türkçe ek toleranslı algoritma, tüm bilgi tek kelime havuzunda, mahremiyet duvarı düzeltildi (tarama ofis geneli, gösterim kişiye özel), sadece Aktif portföyler dahil. bkz. [[Modul-Esletirme]].
5. **Bildirim yönlendirme düzeltmeleri** — "Onay bekleyen ilan" ve "Portföyünüz onaylandı" bildirimleri ilgili sayfaya yönlendirmeye başladı. bkz. [[Modul-Bildirimler]].
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
