# Remax Entegre Emlak Ofisi Yönetim ve CRM Sistemi

Bu depo, briefte tarif edilen sistemin **adım adım, birlikte inşa edilen**
gerçek kaynak kodudur. Her modül tamamlandıkça buraya eklenecek.

## Klasörler

- `backend/` — NestJS + PostgreSQL API
- `frontend/` — React (Vite) arayüz

## Hızlı Başlangıç

```bash
# 1) Backend
cd backend
cp .env.example .env   # PostgreSQL bilgilerinizi girin
createdb remax_crm
npm install
npm run start:dev      # http://localhost:3000/api

# 2) Frontend (yeni bir terminalde)
cd frontend
npm install
npm run dev             # http://localhost:5173
```

## İlerleme Durumu

| # | Modül | Durum |
|---|-------|-------|
| 1 | **Müşteri (CRM) Modülü** — müşteri kartları, arama/filtreleme, görüşme geçmişi | ✅ Tamamlandı |
| 2 | Auth Modülü — Broker/Danışman girişi, JWT, rol tabanlı yetki (Mahremiyet Duvarı) | ⏳ Sırada |
| 3 | Portföy (İlan) Modülü | ⏳ Planlandı |
| 4 | Komisyon & Finansal Modül | ⏳ Planlandı |
| 5 | Broker Dashboard (canlı aktivite, lig tablosu) | ⏳ Planlandı |
| 6 | Mobil saha uygulaması (React Native) | ⏳ Planlandı |

## Neden Auth bir sonraki adım olmalı?

Şu an müşteri kayıtlarında `agentId` alanı var ama kimin giriş yaptığını
bilen bir sistem yok — yani brief'teki "Mahremiyet Duvarı" (danışmanın
sadece kendi müşterilerini görmesi) henüz gerçek anlamda çalışmıyor.
Bir sonraki adımda bunu ekleyip, Müşteri modülünü buna bağlamanı öneririm.

## Tasarım notu

Arayüz, "tapu kayıt defteri" temasından ilham alır: lacivert + pirinç
(brass) vurgu rengi, kağıt tonu zemin, müşteri kayıtları dosya sekmesi
(folder-tab) filtrelerle, görüşme geçmişi ise zaman damgalı defter
kayıtları (ledger) gibi gösterilir. Detaylar `frontend/src/index.css`
içinde.
