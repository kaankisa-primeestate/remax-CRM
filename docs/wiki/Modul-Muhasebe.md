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

## Raporlama Sistemi (Önemli — 2026-09-07'de iş odaklı 5 rapora sadeleştirildi)

`AccountingPage.jsx`'in "Raporlar" bölümü artık **iş ihtiyacına göre adlandırılmış 5 rapor türü** sunar (önceki "Kategori Özeti / Trend / Hesap Özeti / Günlük Nakit Akışı" görünümleri kaldırıldı — kullanıcı bunları "karışık ve gereksiz" bulduğu için). Akış: **1. Rapor Türünü seç → 2. Tarih aralığını seç → "Raporu Getir" → sonuç aynı ekranda altta.**

Rapor türleri (`REPORT_TYPES` sabiti, `AccountingPage.jsx`):

1. **Genel Özet** (varsayılan) — dönemin toplam gelir/gider/ortak cari net/net durumunu 4 kartla gösterir (`managementReport.summary`), altında transferler hariç tüm hareketlerin tablosu.
2. **Komisyon Gelirleri** — `movements` listesi, `classification === 'income'` ve `category === 'Komisyon Tahsilatı'` olan kayıtlarla filtrelenir.
3. **Danışman Aidat / Masa Kirası** — aynı mantık, `category === 'Danışman Kirası Tahsilatı'`.
4. **Ofis Masraf ve Giderleri** — `classification === 'expense'` olan kayıtlar + `expenseByCategory` kırılımı (backend'den zaten geliyor).
5. **Ortak Cari Hareketleri** — `classification` değeri `partner_in`/`partner_out` olan kayıtlar (giriş/çıkış/net kartlarıyla).

**Önemli:** Komisyon ve aidat filtresi, backend'in bu tahsilatları otomatik kaydederken kullandığı **sabit kategori adı string'ine** (`accounting.service.ts` içindeki `'Komisyon Tahsilatı'` ve `'Danışman Kirası Tahsilatı'` literalleri) bağımlıdır — bu isimler backend'de değişirse, frontend'deki `COMMISSION_INCOME_CATEGORIES`/`DUES_INCOME_CATEGORIES` sabitleri de (`AccountingPage.jsx` üstü) güncellenmelidir. Aynı desen, ortak cari ayrımı için zaten backend'de `PARTNER_FINANCING_INCOME_CATEGORIES`/`PARTNER_FINANCING_EXPENSE_CATEGORIES` olarak kullanılıyordu; bu sefer eşleştirme bilinçli olarak backend'e taşınmadı, frontend'de tutuldu (yeni backend riski almamak için) — hiçbir yeni backend endpoint'i veya migration gerekmedi.

Rapor sayfasında artık düzenleme/iptal/geçmiş butonları **yok** — bunlar "Hareketler" sekmesinde zaten mevcut; rapor sadece görüntüleme amaçlıdır.

Ayrıca, ortak cari hızlı-ekleme seçeneklerinden biri (`PARTNER_MOVEMENT_TYPES` içindeki `loan_out`) `'Ortağa Borç Ödemesi'` kategorisiyle kayıt açıyordu ama backend'in ortak-cari-çıkışı tanıdığı liste `'Ortağa Borç Geri Ödemesi'` bekliyordu — bu yüzden bu tür kayıtlar Ortak Cari raporuna hiç düşmüyordu. Bu isim uyuşmazlığı da bu oturumda düzeltildi.

Ana endpoint değişmedi: `GET /accounting/reports/management` (`accounting.service.ts` → `getManagementReport()`), tek bir çağrıda tüm rapor türleri için gereken veriyi (`summary`, `movements`, `incomeByCategory`, `expenseByCategory`, `pending`) döner. `accountBalances` ve `dailyCashFlow` alanları backend'den gelmeye devam ediyor ama artık raporlar ekranında kullanılmıyor (Hesaplar sekmesiyle örtüştüğü için kaldırıldı).

## Eski Finans → Yeni Muhasebe Aktarımı

`AccountingPage.jsx`'te ayrı bir "migration" sekmesi var — eski `Expense`/`BankAccount`/`Commission` (bkz. [[Modul-Diger-Finansal-Kayitlar]]) verilerini yeni `AccountingEntry` sistemine taşımadan önce **salt okunur önizleme** sunar, hiçbir veri silmez/oluşturmaz.

## İlgili Modüller

- [[Modul-Komisyon-ve-Hakedis]] — komisyon kayıtları muhasebeye otomatik işler
- [[Modul-Islemler]] — kapanış, komisyon üzerinden muhasebeye yansır
- [[Modul-Diger-Finansal-Kayitlar]] — eski/paralel finansal kayıt sistemleri
