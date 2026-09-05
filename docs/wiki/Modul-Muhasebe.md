---
tags: [modul, muhasebe]
---

# Modül: Muhasebe

**Backend:** `backend/src/accounting/` (birden çok entity — bkz. aşağı)
**Frontend:** `AccountingPage.jsx` (route: `/muhasebe`, sadece Broker; en büyük tek sayfa dosyalarından biri, 2600+ satır), `ExpenseCategoryDetailPage.jsx`

## Entity'ler

- `AccountingEntry` (tablo `accounting_entries`) — her gelir/gider/transfer hareketi. Alanlar: `type` (`AccountingEntryType`), `date`, `amount`, `currency`, `accountId`, `counterAccountId` (transferde karşı hesap), `category`, `partyType` (`AccountingPartyType`), `partyId`, `partyName`, `description`, `referenceNo`, `sourceKey`/`sourceType`/`sourceId` (hangi modülden otomatik geldiği — örn. komisyon, kira), `voidedAt` (iptal, soft-delete)
- `AccountingAccount` (tablo `accounting_accounts`) — banka/kasa/kredi kartı hesapları. `type` (`AccountingAccountType`: `bank`, `cash`, `credit_card`), `name`, `bankName`, `iban`, `currency`, `openingBalance`
- `AccountingCommission` — bir işlemin (Transaction) ürettiği komisyon kaydı, bkz. [[Modul-Komisyon-ve-Hakedis]]
- `AccountingRent` — danışman kira/aidat tahakkukları
- `AccountingParty` — cari kartlar (danışman, ortak, müşteri, tedarikçi)
- `AccountingCategory` — gider/gelir kategori tanımları
- `AccountingRecurringExpense` — tekrarlayan (aylık vb.) gider şablonları
- `AccountingQuickExpensePreference` — sık kullanılan gider kısayolları
- `AccountingAuditLog`, `AccountingResetLog` — denetim ve sıfırlama kayıtları

### AccountingEntryType

`income`, `expense`, `transfer`

### AccountingPartyType

`agent`, `partner`, `customer`, `vendor`, `other`

## Raporlama Sistemi (Önemli — Yeniden Tasarlandı)

`AccountingPage.jsx`'in "Raporlar" bölümü, tek bir **"Rapor türü" seçim kutusu** ile çalışır (5 seçenek), sadece seçilen görünür — eski tasarımda tüm raporlar alt alta uzun bir sayfa oluşturuyordu:

1. **Kategori özeti** (varsayılan) — seçilen dönemde tüm gider/gelir kategorilerinin toplamı, tek liste + genel toplam. Backend'de zaten var olan `incomeByCategory`/`expenseByCategory` (management-report endpoint'inin `toCategoryRows()` fonksiyonu) kullanılır — yeni backend kodu gerekmedi.
2. **Tek kategori trendi** — bir kalemin seçilen dönem içindeki **aylık** kırılımı. Backend'e dokunulmadan, gelen ham `movements` listesi frontend'de JS ile ay bazında (`entry.date.slice(0,7)`) gruplanır.
3. **Giriş/çıkış detayı** — tüm hareketlerin filtrelenebilir tablosu (arama, hareket türü, hesap, kategori filtreleri)
4. **Hesap özeti** — hesap bazında dönem başı/sonu bakiye
5. **Günlük nakit akışı** — gün gün giriş-çıkış

Ana endpoint: `GET /accounting/reports/management` (`accounting.service.ts` → `getManagementReport()`), tek bir çağrıda tüm rapor türleri için gereken veriyi (`summary`, `accountBalances`, `movements`, `dailyCashFlow`, `incomeByCategory`, `expenseByCategory`, `pending`) döner.

## Eski Finans → Yeni Muhasebe Aktarımı

`AccountingPage.jsx`'te ayrı bir "migration" sekmesi var — eski `Expense`/`BankAccount`/`Commission` (bkz. [[Modul-Diger-Finansal-Kayitlar]]) verilerini yeni `AccountingEntry` sistemine taşımadan önce **salt okunur önizleme** sunar, hiçbir veri silmez/oluşturmaz.

## İlgili Modüller

- [[Modul-Komisyon-ve-Hakedis]] — komisyon kayıtları muhasebeye otomatik işler
- [[Modul-Islemler]] — kapanış, komisyon üzerinden muhasebeye yansır
- [[Modul-Diger-Finansal-Kayitlar]] — eski/paralel finansal kayıt sistemleri
