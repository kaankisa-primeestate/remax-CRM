---
tags: [modul, finans, eski-sistem]
---

# Modül: Diğer Finansal Kayıtlar

Bu sayfa, [[Modul-Muhasebe]]'nin yeni birleşik sistemine (`AccountingEntry`) geçmeden **önce** var olan, kısmen hâlâ kullanılan küçük/paralel finansal modülleri toplar. Bazıları [[Modul-Muhasebe]]'deki "Eski Finans → Yeni Muhasebe Aktarımı" önizlemesinin **kaynağıdır**.

## Ortaklar (Partners)

**Backend:** `backend/src/partners/` (entity `Partner`, `PartnerLedgerEntry`)
Alanlar: `name`, `sharePercentage`, `isActive`. Ofis ortaklarının pay oranını ve cari hareketlerini (`PartnerLedgerEntry`) tutar. [[Modul-Muhasebe]]'deki `AccountingPartyType.PARTNER` ile ilişkilidir — ortak finansmanı hareketleri (`PARTNER_FINANCING_*_CATEGORIES`) muhasebe raporlarında ayrı gösterilir.

## Çek/Senet (Cheque Notes)

**Backend:** `backend/src/cheque-notes/` (entity `ChequeNote`)
Alanlar: `type`, `direction` (`ChequeNoteDirection` — alınan/verilen), `amount`, `dueDate`, `drawerName`, `referenceNo`, `status`, `bankAccountId`, `receiptUrl`

## Banka Hesapları (Eski Sistem)

**Backend:** `backend/src/bank-accounts/` (entity `BankAccount`, `BankTransaction`)
Alanlar: `type` (`AccountType`), `bankName`, `accountName`, `iban`, `currency`, `isActive`

**Not:** Bu, [[Modul-Muhasebe]]'deki yeni `AccountingAccount` entity'sinden **farklı, eski** bir hesap tablosudur. Yeni geliştirmeler `AccountingAccount` kullanmalı.

## Danışman Aidatları (Agent Dues)

**Backend:** `backend/src/agent-dues/` (entity `AgentDue`)
Alanlar: `agentId`, `period`, `expectedAmount`, `paid`, `paidDate`, `bankAccountId`
**Frontend:** `AgentDuesPage.jsx` (route: `/aidatlar`)

Aylık danışman aidat tahakkuklarını takip eder. Bir cron job (`generateForMonthInternal`), her ay otomatik olarak (artık [[Modul-Muhasebe]]'deki `AccountingRent`'e yazacak şekilde güncellenmiştir — bkz. modülün kod geçmişi) yeni tahakkuklar üretir.

## Danışman Cari Hesabı (Agent Ledger)

**Backend:** `backend/src/agent-ledger/` (entity `AgentLedgerAdjustment`)
**Frontend:** `AgentLedgerStatementPage.jsx` (route: `/cari-hesap/:agentId` Broker için, `/cari-hesabim` Danışman için kendi görünümü)

Danışmanın komisyon hakedişi, aidat borcu gibi kalemlerin birleşik ekstresini gösterir.

## Eski Gider Sistemi (Expenses)

**Backend:** `backend/src/expenses/` (entity `Expense`, `ExpenseCategoryDefinition`) + `backend/src/recurring-expenses/` (`RecurringExpense`)
**Frontend:** `ExpenseCategoryDetailPage.jsx` (route: `/giderler/:categoryId`)

[[Modul-Muhasebe]]'deki `AccountingEntry` (type: expense) ile **aynı amaca** hizmet eden, daha eski bir sistem. Yeni geliştirmeler `AccountingEntry` kullanmalı; bu modül geriye dönük uyumluluk ve aktarım önizlemesi için duruyor.

## Planlanan Birleştirme

Danışman menüsündeki "Komisyonlar", "Aidatlarım", "Cari Hesabım" sekmelerinin ileride "Cari Hesabım" başlığı altında (alt sekme olarak) birleştirilmesi planlanıyor — henüz yapılmadı.

## İlgili Modüller

- [[Modul-Muhasebe]] — bu modüllerin çoğunun yerini almaya aday, birleşik yeni sistem
