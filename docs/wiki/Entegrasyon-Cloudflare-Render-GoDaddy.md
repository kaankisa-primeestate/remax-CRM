---
tags: [entegrasyon, hosting, domain]
---

# Entegrasyon: Cloudflare, Render, GoDaddy

## Genel Şema

```
Kullanıcı tarayıcısı
        │
        ▼
bu-crm.site (Cloudflare Pages — frontend, React build)
        │  API istekleri
        ▼
api.bu-crm.site (Render.com — backend, NestJS)
        │
        ▼
PostgreSQL (Render.com — "Starter" ücretli plan)
```

## GoDaddy

- Domain (bu-crm.site) buradan satın alındı
- Nameserver'lar Cloudflare'e yönlendirildi (`nora.ns.cloudflare.com`, `pablo.ns.cloudflare.com`) — DNS yönetimi tamamen Cloudflare'de yapılıyor, GoDaddy sadece kayıt (registrar) rolünde

## Cloudflare

- **DNS:** bu-crm.site zone'u, Free plan
- **Pages:** frontend'in statik build'i burada barınıyor. Custom domain olarak `bu-crm.site` ve `www.bu-crm.site` bağlı.
- **DNS kaydı — backend için:** `api` adında bir **CNAME** kaydı, `remax-crm-backend.onrender.com`'a işaret ediyor, **Proxy status: DNS only** (turuncu bulut değil, gri) — bu önemli, Render'ın kendi SSL sertifikasını kurabilmesi için proxy kapalı olmalı.
- Ortam değişkeni `VITE_API_URL` (Cloudflare Pages proje ayarlarında, build-time), `https://api.bu-crm.site/api` değerini taşır. Bu değiştiğinde **yeniden deploy tetiklenmesi gerekir** (build-time okunur, sadece kaydetmek yetmez).

## Render.com

- **Backend web servisi** (`remax-crm-backend`): NestJS API, `Custom Domains` altında `api.bu-crm.site` tanımlı (Verified + Certificate Issued durumunda olmalı)
- **PostgreSQL veritabanı:** "Starter" (ücretli) planda. **Önemli:** Render'ın **ücretsiz** PostgreSQL planı 30 gün sonra süre doluyor, 14 gün ek süre sonunda **kalıcı olarak siliniyor** (yedek de tutulmuyor). Bu proje ücretli planda olduğu için bu risk yok, ama gelecekte plan değişikliği yapılırsa kontrol edilmeli.
- Render'ın "Workspace Plan" (Hobby/Pro/Scale) ile bir servisin "Instance Type/compute plan"ı (Free/Starter/Standard) **farklı kavramlardır** — workspace planı ekip/bandwidth limitlerini etkiler, veritabanının silinme riskiyle ilgisi yoktur.

## Eski Domain (remaxbostanci.com)

- Hâlâ Namecheap'te kayıtlı, hâlâ Cloudflare Pages custom domain listesinde duruyor (silinmedi)
- Ama backend `ALLOWED_ORIGINS` listesinden çıkarıldığı için, bu adres üzerinden **sisteme giriş yapılamıyor** — sayfa açılır ama API istekleri CORS hatası alır
- bkz. [[00-Tasarim-Kararlari]] "Domain Geçişi" kararı

## CORS Ayarı (Kod Tarafı)

`backend/src/main.ts` → `ALLOWED_ORIGINS` dizisi. Yeni bir domain eklenecekse ya da eskisi kaldırılacaksa burası güncellenmeli — **ama dikkat:** bu değişiklik push edilmeden önce yeni domain'in DNS/Cloudflare/Render tarafında tamamen çalışır hale getirilmiş olması gerekir, aksi halde mevcut canlı sistem anında CORS hatası vermeye başlar.
