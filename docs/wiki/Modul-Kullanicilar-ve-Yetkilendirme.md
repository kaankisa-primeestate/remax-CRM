---
tags: [modul, kullanicilar]
---

# Modül: Kullanıcılar ve Yetkilendirme

**Backend:** `backend/src/users/` (entity `User`, tablo `users`), `backend/src/auth/` (JWT, login, şifre sıfırlama)
**Frontend:** `AgentsPage.jsx` (route: `/danismanlar`, sadece Broker), `ChangePasswordPage.jsx` (route: `/sifre-degistir`), `LoginPage.jsx`, `ForgotPasswordPage.jsx`, `ResetPasswordPage.jsx`

## Veri Modeli (User)

Kimlik: `name`, `email` (unique), `phone`, `address`, `birthDate`, `nationalId`
Şirket/lisans bilgisi: `companyName`, `taxId`, `companyType` (`CompanyType`), `taxOffice`, `mykCertificateNo` (MYK Seviye 5 Belge No), `realEstateLicenseUrl`, `officeName`
Komisyon: `commissionShareType`, `commissionSharePercentage`, `tierCommissionRules` (jsonb — kademeli oran)
Sözleşme: `contractStartDate`, `mentorAgentId`, `powerStartCompleted`, `powerStartCertificateNo/Date`
Güvenlik: `passwordHash`, `isActive`, `resetTokenHash`, `resetTokenExpiresAt`, `passwordChangedAt`
Rol ve hedefler: `role` (`UserRole`), `lastNotificationsSeenAt`, `monthlyTarget`, `monthlyDuesAmount`, `duesStartDate`

## Roller — bkz. [[00-Guvenlik-ve-Roller]]

## Broker'a Özel Hesap Yönetimi (`ChangePasswordPage.jsx`)

Bu sayfa, rolden bağımsız temel "Şifre Değiştir" formunun yanında, **sadece Broker girişinde görünen** iki ek bölüm içerir:

1. **E-posta Adresini Değiştir** — `PATCH /users/change-email`, backend'de `requestingUserRole !== 'broker'` kontrolü yapılır. Mevcut şifre doğrulaması gerektirir. Başarılı olunca otomatik çıkış yapılıp yeni e-postayla giriş istenir. Bu, ilk kurulumdaki `admin@remax.local` gibi geçici adresleri gerçek bir adrese dönüştürmek için var.
2. **Yeni Yönetici Ekle** — `POST /users/brokers`, bir iş ortağına **ayrı, kendi e-posta/şifresiyle giriş yapabileceği** bir Broker hesabı açar. Danışman ekleme akışından (`createAgent`, daha fazla alan gerektirir — MYK, vergi vb.) farklı ve daha basittir: sadece isim/e-posta/şifre.

**Bilinçli olarak eklenmedi:** SMS/OTP iki adımlı doğrulama (Yeni Yönetici Ekle için) — sistemde hiç SMS gönderme altyapısı yok, bir Türkiye SMS sağlayıcısında (NetGSM, İletimerkezi gibi) hesap açılması gerekir.

## Danışman Ekleme (`createAgent`)

Broker'ın Danışman Yönetimi sayfasından yeni danışman eklerken kullanılan, daha kapsamlı akış — MYK sertifikası, vergi bilgisi, komisyon oranı gibi ek alanlar içerir. `AgentsPage.jsx`'te aynı formdan mevcut bir danışmanın e-postası da güncellenebilir (`PATCH /users/agents/:id/profile`) — bu, Danışman'ın **kendi** e-postasını değiştirebileceği anlamına gelmez, sadece Broker'ın onun adına yapabileceği bir işlemdir.

## İlgili Modüller

- [[00-Guvenlik-ve-Roller]] — rol tanımları, JWT, şifre sıfırlama kısıtlaması
- [[Modul-Diger-Finansal-Kayitlar]] — danışman aidatları, cari hesap bu modüldeki `User` kaydına bağlıdır
