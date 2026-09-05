---
tags: [modul, bildirimler]
---

# Modül: Bildirimler

**Backend:** `backend/src/notifications/` (`notifications.service.ts` — kendi ana entity'si yok, birden çok modülden veri toplayıp birleştirir; `NotificationDismissal` bir yardımcı entity)
**Frontend:** `components/NotificationBell.jsx` (bildirim zili, tüm sayfalarda görünen üst bar bileşeni)

## Bildirim Türleri (NotificationType)

`new_property`, `property_status_changed`, `new_customer`, `interaction`, `commission_added`, `commission_approved`, `property_pending_approval`, `broker_message`, `showing_disclosure`, `announcement`, `deal_pending_approval`, `collaborative_split_pending`

## Mimari — Toplayıcı Desen

Bildirimler, **kalıcı bir bildirimler tablosu** olarak saklanmaz. Bunun yerine `getAgentNotifications()`/`getBrokerNotifications()` gibi metodlar, ilgili modüllerden (bekleyen onaylar, yeni mülkler, komisyon durumları vb.) **anlık olarak** veri çekip birleştirir. `NotificationDismissal`, kullanıcının "gördüm/kapattım" dediği bildirimleri hatırlamak için kullanılır (kalıcı, id bazlı).

## Yönlendirme (Tıklanınca Nereye Gider)

`NotificationBell.jsx`'teki `handleItemClick`, bildirim türüne göre farklı davranır:
- `broker_message`, `property_pending_approval` → ilgili portföye (`/portfoyler/:id`) yönlendirir
- `showing_disclosure` → Sözleşmeler & Tapu sayfasına (`/sozlesmeler`) yönlendirir
- Diğerleri → bir detay popup'ı açar (gidilecek ayrı bir sayfaları olmadığı için)

**Dikkat:** Yeni bir bildirim türü eklerken, `propertyId` gibi bir referans taşıyorsa **mutlaka** bir yönlendirme davranışı da eklenmeli — geçmişte birkaç bildirim türü (`property_pending_approval` gibi) uzun süre `propertyId` taşıyıp hiçbir yere yönlendirmemişti, bu bir hataydı ve düzeltildi.

## İlgili Modüller

- [[Modul-Portfoy]] — onay/onaylandı bildirimleri
- [[Modul-Islemler]] — komisyon ve işbirlikli satış bildirimleri
- [[Modul-Dijital-Belgeler]] — Yer Gösterme beyanı bildirimi
- [[Modul-Gorevler-ve-Duyurular]] — ofis duyuruları da bu zil üzerinden gösterilir
