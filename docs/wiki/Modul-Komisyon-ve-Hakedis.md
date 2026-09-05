---
tags: [modul, komisyon]
---

# Modül: Komisyon ve Hakediş

**Backend:** `backend/src/commissions/` (eski/paralel sistem: `Commission`, `CommissionPayment`) ve `backend/src/accounting/accounting-commission.entity.ts` (yeni sistem: `AccountingCommission`, tablo `accounting_commissions`)
**Frontend:** `CommissionsPage.jsx` (route: `/komisyonlar`)

## Mimari Not — Eski ve Yeni Sistem

Proje geçmişinde iki komisyon sistemi var: eski `commissions` modülü (Commission/CommissionPayment) ve yeni `AccountingCommission` (Muhasebe modülüne entegre). Yeni kapanışlar **doğrudan** `AccountingCommission`'a yazılır — Danışman'ın eski "manuel komisyon kaydı oluşturma" arka kapısı **kapatıldı**, komisyon SADECE [[Modul-Islemler]] üzerinden "Kapanışı Yap" ile, `transactionId` zorunlu olacak şekilde üretilebilir.

## AccountingCommissionStatus

`pending_collection` (Tahsilat Bekliyor) → `collected` (Tahsil Edildi) → `agent_paid` (Danışmana Ödendi), ya da `voided` (İptal)

## Otomasyon

[[Modul-Islemler]]'de bir işlem `closed` olup `closingAmount` girildiğinde:
- Yasal komisyon oranı otomatik hesaplanır: Satış = %4, Kiralama = 1 aylık kira
- Danışman payı, kullanıcının profilindeki `commissionSharePercentage`/`commissionShareType`'dan otomatik gelir
- `AccountingCommission` kaydı, ilgili `AccountingEntry` hareketleriyle birlikte oluşturulur

## İşbirlikli Satış Komisyon Paylaşımı

bkz. [[Modul-Islemler]] "İşbirlikli Satış" bölümü — iki danışman arasında paylaşılan komisyonlar, her iki tarafın onayını bekler.

## İlgili Modüller

- [[Modul-Islemler]] — komisyonun kaynağı
- [[Modul-Muhasebe]] — komisyon kayıtları muhasebe hareketlerine (AccountingEntry) yansır
- [[Modul-Diger-Finansal-Kayitlar]] — danışman cari hesabı, komisyon hakedişlerini de gösterir
