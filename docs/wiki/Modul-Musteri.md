---
tags: [modul, musteri]
---

# Modül: Müşteri

**Backend:** `backend/src/customers/` (entity `Customer`, tablo `customers`; ayrıca `Interaction`, `VoiceNote` alt-entity'leri)
**Frontend:** `CustomerListPage.jsx`, `CustomerDetailPage.jsx`, `components/CustomerFormModal.jsx`, `components/QuickAddCustomerModal.jsx`

## Veri Modeli (Customer)

`firstName`, `lastName`, `phone`, `email` (unique), `address`, `type` (`CustomerType`), `budget`, `budgetCurrency`, `requirements` (serbest metin — "Aradığı Özellikler"), `notes`, `preferredDistrict` (eski, tekil), `preferredDistricts` (yeni, dizi), `preferredRooms` (dizi, örn. `["2+1","3+1"]`), `wantsSeaView`, `wantsNearMetro`, `propertyInterest`, `purchaseTimeline`, `pipelineStage`, `leadSource`, `agentId`

### CustomerType

`buyer` (Alıcı), `seller` (Satıcı), `tenant` (Kiracı), `landlord` (Ev Sahibi), `investor` (Yatırımcı)

[[Modul-Esletirme]] motoru sadece `buyer`, `investor` (satılık portföyle) ve `tenant` (kiralık portföyle) tiplerini eşleştirir.

## Serbest Metin Alanlarında Yazım Denetimi

`requirements` ve `notes` textarea'larına `spellCheck="true" lang="tr"` eklendi — tarayıcının yerleşik Türkçe yazım denetimi devreye girer, [[Modul-Esletirme]]'nin eşleştirme kalitesini dolaylı olarak artırır (yazım hatası önlenirse eşleşme kaçırma riski azalır).

## İlgili Modüller

- [[Modul-Esletirme]] — bu entity'nin hem yapısal (bütçe, ilçe, oda) hem serbest metin alanları eşleştirmede kullanılır
- [[Modul-Islemler]] — bir müşteri ile bir portföy arasındaki süreç Transaction'da takip edilir
- [[Modul-Dijital-Belgeler]] — Yer Gösterme Belgesi, randevu üzerinden müşteri bilgisini kullanır
