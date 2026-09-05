---
tags: [mimari, altyapi]
---

# Genel Mimari

## Teknoloji Yığını

- **Backend:** NestJS (TypeScript), TypeORM, PostgreSQL
- **Frontend:** React + Vite, React Router, axios
- **Kimlik doğrulama:** JWT (bkz. [[00-Guvenlik-ve-Roller]])

## Hosting ve Domain

- **Frontend:** Cloudflare Pages, proje adı `remax-crm` → https://bu-crm.site
- **Backend:** Render.com, servis adı `remax-crm-backend` → https://api.bu-crm.site/api
- **Veritabanı:** PostgreSQL, Render'da "Starter" (ücretli) plan
- **Domain:** bu-crm.site, GoDaddy'den alındı, DNS kayıtları Cloudflare üzerinden yönetiliyor
- **Eski domain:** remaxbostanci.com — hâlâ kayıtlı (Namecheap) ama backend CORS listesinden çıkarıldı, üzerinden giriş yapılamıyor (bilinçli karar, bkz. [[00-Tasarim-Kararlari]])

Detay için bkz. [[Entegrasyon-Cloudflare-Render-GoDaddy]].

## Backend Modül Listesi

`backend/src/` altında, her biri kendi `*.module.ts`, `*.controller.ts`, `*.service.ts`, `*.entity.ts` dosyalarına sahip modüller:

`accounting`, `agent-dues`, `agent-ledger`, `announcements`, `appointments`, `auth`, `bank-accounts`, `calendar`, `cash-flow`, `cheque-notes`, `commissions`, `customers`, `dashboard`, `digital-documents`, `expenses`, `mail`, `market-news`, `matching`, `notifications`, `partners`, `portfolios`, `property-comments`, `public-disclosure`, `recurring-expenses`, `tasks`, `transactions`, `upload`, `users`, `valuations`

Modül ↔ iş alanı eşleşmesi için bkz. [[index]] üzerindeki "Ana İş Modülleri" listesi.

## Frontend Sayfa Yapısı

Tüm sayfalar `frontend/src/pages/` altında, `App.jsx` içinde route'lanıyor. Tam liste ve rol bazlı erişim için bkz. [[00-Sayfa-Haritasi]].

## API İletişimi

Frontend, `frontend/src/api/client.js` içindeki `apiClient` (axios instance) üzerinden backend'e bağlanır. Base URL, build-time ortam değişkeni `VITE_API_URL` ile ayarlanır (Cloudflare Pages proje ayarlarında tanımlı, kod içinde sabit değil).

## Ortam Değişkenleri (Backend, Render)

- `DEFAULT_BROKER_EMAIL`, `DEFAULT_BROKER_PASSWORD` — ilk kurulumda otomatik oluşan Broker hesabı (veritabanı boşsa)
- `FRONTEND_URL` — şifre sıfırlama linkinin gideceği adres
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` — mail gönderimi (bkz. [[Modul-Kullanicilar-ve-Yetkilendirme]] "Şifre Sıfırlama" bölümü — şu an yapılandırılmamış)
