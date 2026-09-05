---
tags: [modul, islemler]
---

# Modül: İşlemler (Transaction)

**Backend:** `backend/src/transactions/` (entity `Transaction`, tablo `transactions`; ayrıca `TransactionDocument`, `TransactionNote`)
**Frontend:** `TransactionsPage.jsx`, `TransactionDetailPage.jsx`

## Veri Modeli (Transaction)

`customerId`/`externalCustomerLabel`, `propertyId`/`externalPropertyLabel`, `agentId`, `stage`, `showingDate`, `showingNote`, `showingFormCreated`, `offerAmount`, `offerValidityDate`, `offerStatus`, `offerNote`, `depositAmount`, `depositDate`, `deedChecklist` (jsonb dizi), `closingAmount`, `totalCommissionAmount`, `agentCommissionAmount`, `officeCommissionAmount`, `stageChangedAt`, `dealApproved`, `dealApprovedAt`, `collaboratorAgentId`, `commissionSplitPercentage`, `splitApprovedByOwner`, `splitApprovedByCollaborator`, `splitFinalizedAt`

## TransactionStage — Yaşam Döngüsü

```
lead (Talep) → showing (Gösterme) → offer (Teklif) → deed (Tapu) → closed (Kapanış)
```

## OfferStatus

`pending` (Beklemede), `accepted` (Kabul Edildi), `rejected` (Reddedildi), `withdrawn` (Geri Çekildi)

## İşbirlikli Satış (Collaborator)

Bir işlemde iki danışman (sahip + `collaboratorAgentId`) komisyonu paylaşabilir. `commissionSplitPercentage` oranı belirler; her iki tarafın da onayı (`splitApprovedByOwner`, `splitApprovedByCollaborator`) gerekir, ikisi de onaylayınca `splitFinalizedAt` doldurulur. Bekleyen onaylar için bildirim türü: `collaborative_split_pending` (bkz. [[Modul-Bildirimler]]).

## Kapanış → Komisyon Üretimi

`closingAmount` (satış/kira bedeli) girilip işlem `closed` olunca, [[Modul-Komisyon-ve-Hakedis]] modülündeki `AccountingCommission` kaydı **otomatik** oluşturulur. Yasal komisyon oranı otomatik hesaplanır: Satış = %4, Kiralama = 1 aylık kira. Danışman payı oranı, kullanıcının profilindeki `commissionSharePercentage`'dan gelir.

## Broker Onayı

`dealApproved` alanı, Broker'ın kapanışı onayladığını gösterir. Danışman kapanışı yaptığı an [[Modul-Portfoy]] durumu hemen "Satıldı/Kiralandı" olur (Broker onayı beklenmez) — Broker itirazında portföy durumu "Satıldı" kalır, sadece komisyon sürecinde düzeltme yapılır.

## İlgili Modüller

- [[Modul-Portfoy]] — kapanış, portföy durumunu değiştirir
- [[Modul-Komisyon-ve-Hakedis]] — kapanıştan komisyon otomatik üretilir
- [[Modul-Dijital-Belgeler]] — Yer Gösterme, bu modüldeki randevu/gösterme adımıyla ilişkilidir (bkz. [[Modul-Takvim-ve-Randevular]])
