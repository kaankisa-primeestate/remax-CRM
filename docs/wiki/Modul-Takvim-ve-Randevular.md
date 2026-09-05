---
tags: [modul, takvim, randevu]
---

# Modül: Takvim ve Randevular

**Backend:** `backend/src/appointments/` (entity `Appointment`, tablo `appointments`) + `backend/src/calendar/` (takvim görünümü servisi)
**Frontend:** `CalendarPage.jsx` (route: `/takvim`)

## Veri Modeli (Appointment)

`title`, `date`, `time`, `type` (`AppointmentType`), `customerId`, `propertyId`, `agentId`, `notes`, `completed`, ve Yer Gösterme dijital imza alanları: `disclosureAccepted`, `disclosureAcceptedAt`, `disclosureToken`, `disclosureSignatureImage`, `disclosureSignedName`, `disclosureSignatureMethod`, `disclosureSignedIp`

### AppointmentType

`meeting` (Müşteri Görüşmesi), `showing` (İlan Gösterimi), `other`

## Yer Gösterme İlişkisi

Bir randevu `type: 'showing'` olduğunda, [[Modul-Dijital-Belgeler]]'deki "Yer Gösterme" dijital imza akışı bu randevu kaydı **üzerinde** çalışır (ayrı bir tabloya değil, doğrudan `Appointment` alanlarına yazılır). Bu, sistemdeki iki dijital belge yaklaşımından biridir (bkz. [[Modul-Dijital-Belgeler]] "Randevuya Özel Sistem").

## İlgili Modüller

- [[Modul-Musteri]], [[Modul-Portfoy]] — randevu bunlara opsiyonel olarak bağlanır
- [[Modul-Dijital-Belgeler]] — Yer Gösterme imza akışı
- [[Modul-Bildirimler]] — Yer Gösterme beyanı bildirimi (`showing_disclosure`)
