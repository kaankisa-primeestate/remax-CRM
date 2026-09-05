---
tags: [guvenlik, auth, roller]
---

# Güvenlik ve Roller

## Roller

Sadece 2 rol var: `UserRole.BROKER` (`'broker'`) ve `UserRole.AGENT` (`'agent'`) — bkz. `backend/src/users/user.entity.ts`.

- **Broker (Yönetici):** Ofis sahibi/yöneticisi. Tüm portföy, müşteri, muhasebe ve danışman verisine erişir. `brokerOnly` ile korunan sayfalara girebilir (bkz. [[00-Sayfa-Haritasi]]).
- **Agent (Danışman):** Kendi müşterisi/portföyü ile sınırlı bir görünüme sahiptir (bazı modüllerde — bkz. her modülün "Mahremiyet" notu, örn. [[Modul-Esletirme]]).

Birden fazla Broker hesabı olabilir — bkz. [[Modul-Kullanicilar-ve-Yetkilendirme]] "Yeni Yönetici Ekle".

## Kimlik Doğrulama Akışı

- JWT tabanlı. Giriş başarılı olunca token döner, sonraki isteklerde `Authorization` header'ında taşınır.
- `CurrentUserPayload` tipi (`backend/src/auth/current-user.decorator.ts`): `{ userId, role: 'broker' | 'agent', name, email }` — controller'larda `@CurrentUser() user: CurrentUserPayload` ile enjekte edilir.
- **Dikkat:** `role` alanı küçük harfli string (`'broker'`, `'agent'`) olarak taşınır, `UserRole` enum değerleriyle birebir eşleşir. Rol kontrolü yapan yeni kod yazılırken `user.role !== 'broker'` gibi doğrudan string karşılaştırması kullanılmalı.

## CORS

`backend/src/main.ts` içinde `ALLOWED_ORIGINS` listesi, hangi frontend adreslerinden gelen isteklere izin verileceğini belirler. Domain değişikliğinde bu liste güncellenmeli (bkz. [[Entegrasyon-Cloudflare-Render-GoDaddy]]).

## İlk Kurulum (Seed) Hesabı

`backend/src/users/users.service.ts` içindeki `onModuleInit`: veritabanında **hiç kullanıcı yoksa**, otomatik olarak `admin@remax.local` / `broker123` (ya da `DEFAULT_BROKER_EMAIL`/`DEFAULT_BROKER_PASSWORD` ortam değişkenleri tanımlıysa onlar) ile bir Broker hesabı oluşturur. Bu, **gerçek bir e-posta değildir** — ilk girişten sonra gerçek bir adrese değiştirilmesi gerekir (bkz. [[Modul-Kullanicilar-ve-Yetkilendirme]]).

## Şifre Sıfırlama — Bilinen Kısıtlama

`backend/src/mail/mail.service.ts`: SMTP ortam değişkenleri (`SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`) tanımlı değilse, `isConfigured()` `false` döner ve şifre sıfırlama maili **hiç gönderilmez** (sadece bir uyarı log'u yazılır). Şu an bu değişkenler **yapılandırılmamış** — yani şifre sıfırlama akışı üretimde çalışmıyor. Bir SMTP servisi (Gmail, Outlook vb.) bağlanana kadar, şifre unutulursa kurtarma yolu yok; bu yüzden Broker hesaplarının şifrelerini güvenli bir yerde saklaması önemli.

## Yetkilendirme Deseni (Backend)

Servis metodlarında rol kontrolü genelde şu şekilde yapılır:
```ts
if (requestingUserRole !== 'broker') {
  throw new ForbiddenException('...');
}
```
Örnekler: `users.service.ts` içindeki `updateOwnEmail`, `createBroker`.
