---
tags: [modul, gorevler, duyurular]
---

# Modül: Görevler ve Duyurular

## Görevler (Tasks)

**Backend:** `backend/src/tasks/` (entity `Task`, tablo `tasks`)
**Frontend:** `TasksPage.jsx` (route: `/gorevler`)

### Veri Modeli

`title`, `dueDate`, `completed`, `customerId` (opsiyonel bağlantı), `agentId`, `notes`

Basit bir kişisel yapılacaklar listesi — her Danışman kendi görevlerini görür/yönetir, isteğe bağlı olarak bir müşteriyle ilişkilendirilebilir.

## Duyurular (Announcements)

**Backend:** `backend/src/announcements/` (entity `Announcement`, tablo `announcements`; ayrıca `AnnouncementDismissal`, `AnnouncementResponse`)
**Frontend:** Duyurular, [[Modul-Bildirimler]] zili üzerinden gösterilir (`announcement` bildirim türü), ayrı bir sayfası yok.

### Veri Modeli (Announcement)

`title`, `message`, `createdBy`, `targetAgentIds` (dizi, `null` ise herkese), `type` (`'general' | 'celebration' | 'meeting'`)

- `AnnouncementDismissal` — bir kullanıcının duyuruyu "gördüm" diye kapatması
- `AnnouncementResponse` — bazı duyuru türlerinde (örn. toplantı) kullanıcıların yanıt/RSVP vermesi

Broker, ofis geneline ya da belirli danışmanlara (`targetAgentIds`) duyuru gönderebilir.

## İlgili Modüller

- [[Modul-Bildirimler]] — duyurular bildirim zili üzerinden gösterilir
- [[Modul-Musteri]] — görevler isteğe bağlı olarak müşteriye bağlanabilir
