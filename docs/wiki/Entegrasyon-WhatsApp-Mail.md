---
tags: [entegrasyon, whatsapp, mail]
---

# Entegrasyon: WhatsApp ve Mail

## Kritik Netlik — Gerçek API Değil

bkz. [[00-Tasarim-Kararlari]] "WhatsApp / Mail" bölümü için tam gerekçe. Özet: bu sistemde **hiçbir otomatik mesajlaşma servisi yoktur**.

## WhatsApp

`frontend/src/utils/contact.js` içindeki `buildWhatsappUrl(phone, message)`, bir `wa.me/<telefon>?text=<mesaj>` linki üretir. Bu link `window.open()` ile açılır — **kullanıcının kendi WhatsApp Web/uygulaması** açılır, mesajı **kullanıcı kendi eliyle "Gönder"e basar**. Sunucu tarafında hiçbir WhatsApp Business API entegrasyonu yoktur.

Kullanıldığı yerler:
- [[Modul-Dijital-Belgeler]] — Yetkilendirme Sözleşmesi ve Yer Gösterme linklerinin mülk sahibine/müşteriye gönderilmesi
- [[Modul-Portfoy]] — portföy paylaşım linki

## Mail

Çoğu "Mail Gönder" butonu, `mailto:` linkidir — kullanıcının kendi mail istemcisini (Outlook, Gmail masaüstü vb.) açar, gövde/konu otomatik doldurulur ama gönderim yine kullanıcının elindedir.

### İstisna — Şifre Sıfırlama Maili (Gerçek SMTP Girişimi, Şu An Çalışmıyor)

`backend/src/mail/mail.service.ts`, gerçek bir SMTP bağlantısı (nodemailer ile) kurmayı **dener** — ama `SMTP_HOST`/`SMTP_USER`/`SMTP_PASS` ortam değişkenleri tanımlı değilse `isConfigured()` false döner ve mail **hiç gönderilmez**. bkz. [[00-Guvenlik-ve-Roller]] "Şifre Sıfırlama — Bilinen Kısıtlama".

Bu, sistemdeki **tek** gerçek (potansiyel) otomatik mesaj gönderme noktasıdır; henüz aktif değildir.

## Mesaj İçeriği Kuralı

Gönderilen her mesaj (WhatsApp/mailto), ilgili kaydın **özet bilgilerini** (adres, fiyat, danışman adı vb.) otomatik içermeli — boş, jenerik bir "bakar mısınız" mesajı olmamalı. Bu, [[00-Tasarim-Kararlari]]'nda kalıcı bir kural olarak belirlendi.
