---
tags: [modul, dijital-belgeler, imza]
---

# Modül: Dijital Belgeler

İki paralel sistem var — biri genel/genişletilebilir (`digital-documents`), biri Randevu'ya özel, ilk kurulan sistem (`public-disclosure`).

## 1. Genel Sistem — `digital-documents`

**Backend:** `backend/src/digital-documents/` (entity `DigitalDocument`, tablo `digital_documents`)
**Frontend:** `PublicDocumentPage.jsx` (route: `/belge/:token`, herkese açık/auth gerektirmez)

### Veri Modeli

`type` (`DigitalDocumentType`), `propertyId`, `customerId`, `agentId`, `token` (uuid, tahmin edilemez), `dataSnapshot` (jsonb — **gönderildiği andaki** tüm verinin donmuş kopyası), `signed`, `signedAt`, `signatureImage`, `signedName`, `signatureMethod` (`'draw' | 'type'`), `signedIp`

### DigitalDocumentType

Şu an tek değer: `authorization_sale` (Satılık Portföy Yetkilendirme Sözleşmesi). İleride yeni belge türleri (örn. Kapora Tutanağı, Fiyat Teklifi) bu tabloya **yeni bir enum değeri** olarak eklenebilir — yeni bir tablo gerekmez, bu yüzden "genel" sistem olarak tasarlandı.

### Neden `dataSnapshot` (jsonb)?

Belge gönderildiği andaki portföy/müşteri/danışman bilgisi **donuk bir kopya** olarak saklanır. Sonradan portföy fiyatı değişse bile, imzalanan belgenin içeriği sabit kalır — hukuki açıdan zorunlu (bkz. [[00-Tasarim-Kararlari]]).

### Akış

1. Danışman, Portföy Detay sayfasında "Yetkilendirme Sözleşmesi Gönder" butonuna basar (`property.ownerPhone` doluysa aktif)
2. Backend `dataSnapshot`'ı portföyün güncel verisinden (Ada/Parsel/Sahiplik Oranı dahil `extraAttributes`) doldurur, `token` üretir — **idempotent**: aynı portföy için zaten imzalanmamış bir kayıt varsa aynısını döner
3. WhatsApp linki (`/belge/:token`) oluşturulup `wa.me` üzerinden açılır (bkz. [[00-Tasarim-Kararlari]] "WhatsApp/Mail" bölümü)
4. Mülk sahibi linke girer, özet bilgileri görür, "Sözleşme metnini oku" ile tam metne erişir, **çizerek** ya da **yazarak** imzalar
5. `POST /public/document/:token/sign` imzayı kaydeder, `signed = true` olur

## 2. Randevuya Özel Sistem — `public-disclosure` (Yer Gösterme)

**Backend:** `backend/src/public-disclosure/`, imza alanları doğrudan [[Modul-Takvim-ve-Randevular]]'daki `Appointment` entity'sinde tutulur: `disclosureAccepted`, `disclosureAcceptedAt`, `disclosureToken`, `disclosureSignatureImage`, `disclosureSignedName`, `disclosureSignatureMethod`, `disclosureSignedIp`
**Frontend:** `PublicDisclosurePage.jsx` (route: `/onay/:token`)

Bu, Yer Gösterme Belgesi'nin (müşteriye mülkü gezdirmeden önce imzalatılan belge, komisyon güvencesi için) dijital imza akışıdır. Her randevu için ayrı düzenlenir — portföy geneli değil, randevu bazlıdır.

## Ortak Mimari Not

İki sistem de aynı deseni kullanır: tahmin edilemez `token` (uuid) + tek kullanımlık + imzalanınca `GoneException` (410) döner. Auth gerektirmez (`@UseGuards` bilinçli olarak konmamıştır) — güvenlik token'ın tahmin edilemezliğinden gelir.

## Sözleşmeler & Tapu Sayfası

`ContractsPage.jsx` (route: `/sozlesmeler`, sadece Broker), hem Yer Gösterme hem Yetkilendirme Sözleşmesi kayıtlarının merkezi/filtrelenebilir görünümünü sağlar.

## İlgili Modüller

- [[Modul-Portfoy]] — Yetkilendirme Sözleşmesi, portföyün `extraAttributes` verisini kullanır
- [[Modul-Takvim-ve-Randevular]] — Yer Gösterme, randevu entity'sinin bir parçasıdır
- [[00-Tasarim-Kararlari]] — "Dijital Belgeler — Tek Kaynak, Otomatik Senkron" kararı
