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

## Raporlama Sistemi (Önemli — 2026-09-08'de 3 kutulu, arama destekli menüye geçildi)

`AccountingPage.jsx`'in "Raporlar" bölümü, 3 aşamalı bir seçim akışıyla çalışır: **1. Rapor Türü → 2. Kapsam (Tümü / belirli danışman-kategori-ortak, yazarak aratılabilir) → 3. Tarih Aralığı → "Raporu Getir"**. Sonuç, "Getir"e basılana kadar değişmez (bkz. `appliedReportType`/`appliedReportSubFilter` — box1/box2'deki taslak seçim `reportType`/`reportSubFilter`'dan ayrı tutulur).

Rapor türleri (`REPORT_TYPES` sabiti):

1. **Genel Özet** (varsayılan) — 2. kutu devre dışı (tek "Tüm dönem" metni); dönemin toplam gelir/gider/ortak cari net/net durumunu 4 kartla gösterir, altında transferler hariç tüm hareketlerin tablosu.
2. **Komisyon Gelirleri** — 2. kutu: gerçek danışman listesi (`agents`, `usersApi.listAgents()`'tan, alfabetik, aranabilir). `category === 'Komisyon Tahsilatı'` olan gelir kayıtları, seçilirse `entry.partyId` ile danışmana daraltılır.
3. **Danışman Aidat / Masa Kirası** — aynı danışman listesi, `category === 'Danışman Kirası Tahsilatı'`.
4. **Ofis Masraf ve Giderleri** — 2. kutu: gerçek gider kategorileri (`categoryNames(EXPENSE_CATEGORIES, customCategories.expense)`), `classification === 'expense'` kayıtları + `expenseByCategory` kırılımı.
5. **Ortak Cari Hareketleri** — 2. kutu: gerçek ortak listesi (`parties.filter(p => p.type === 'partner')`), `partner_in`/`partner_out` kayıtları, seçilirse `entry.partyId` ile ortağa daraltılır.

2. kutunun arama/seçim arayüzü `SearchableSelect` bileşenidir (`AccountingPage.jsx` içinde, dosya başına yakın) — yazarak filtreleyen, dışına tıklayınca kapanan basit bir combobox; harici kütüphane gerektirmez.

**Önemli — veri kaynağı gerçek, uydurma değil:** 2. kutunun seçenekleri (danışman/kategori/ortak) hiçbir zaman sabit/hard-code liste değildir — `agents` ve `parties` state'leri, "Raporlar" sekmesi açıldığında `loadAgents()`/`loadParties()` ile gerçek backend verisinden yüklenir (bkz. `useEffect` — `activeTab === 'reports'`). Komisyon/aidat filtresi `entry.partyId` üzerinden, `agent.id` ile birebir eşleşir (backend `commission.agentId`/`rent.agentId`'yi doğrudan `partyId` olarak yazıyor — bkz. `accounting.service.ts` `collectCommission`/`collectRent`). Ortak Cari filtresi de aynı şekilde `party.id` ile eşleşir (bkz. `partnerMovementForm.partyId`).

Komisyon/aidat **tür** ayrımı (Genel Özet dışındaki dört rapordan hangi movement'ın hangisine ait olduğu), backend'in bu tahsilatları otomatik kaydederken kullandığı **sabit kategori adı string'ine** (`'Komisyon Tahsilatı'`, `'Danışman Kirası Tahsilatı'`) bağımlıdır — bu isimler backend'de değişirse, frontend'deki `COMMISSION_INCOME_CATEGORIES`/`DUES_INCOME_CATEGORIES` sabitleri de güncellenmelidir.

Rapor sayfasında düzenleme/iptal/geçmiş butonları **yok** — bunlar "Hareketler" sekmesinde zaten mevcut; rapor sadece görüntüleme amaçlıdır.

Ayrıca, ortak cari hızlı-ekleme seçeneklerinden biri (`PARTNER_MOVEMENT_TYPES` içindeki `loan_out`) `'Ortağa Borç Ödemesi'` kategorisiyle kayıt açıyordu ama backend'in ortak-cari-çıkışı tanıdığı liste `'Ortağa Borç Geri Ödemesi'` bekliyordu — bu yüzden bu tür kayıtlar Ortak Cari raporuna hiç düşmüyordu. Bu isim uyuşmazlığı 2026-09-07'de düzeltildi.

**Kaldırılan/kullanılmayan dosya:** `frontend/src/pages/ReportsPage.jsx` — 2026-09-07'de eklendi ama hiçbir route/menüye bağlanmadı (bkz. `App.jsx`), sahte/uydurma veriyle çalışıyordu, build çıktısına dahi girmiyordu (kullanılmadığı için tree-shake ediliyordu). Bu dosya silindi; gerçek rapor mantığı hep `AccountingPage.jsx` içinde kalmalı.

Ana endpoint değişmedi: `GET /accounting/reports/management` (`accounting.service.ts` → `getManagementReport()`), tek bir çağrıda tüm rapor türleri için gereken veriyi (`summary`, `movements`, `incomeByCategory`, `expenseByCategory`, `pending`) döner. `accountBalances` ve `dailyCashFlow` alanları backend'den gelmeye devam ediyor ama artık raporlar ekranında kullanılmıyor (Hesaplar sekmesiyle örtüştüğü için kaldırıldı).

## Eski Finans → Yeni Muhasebe Aktarımı

`AccountingPage.jsx`'te ayrı bir "migration" sekmesi var — eski `Expense`/`BankAccount`/`Commission` (bkz. [[Modul-Diger-Finansal-Kayitlar]]) verilerini yeni `AccountingEntry` sistemine taşımadan önce **salt okunur önizleme** sunar, hiçbir veri silmez/oluşturmaz.

## İlgili Modüller

- [[Modul-Komisyon-ve-Hakedis]] — komisyon kayıtları muhasebeye otomatik işler
- [[Modul-Islemler]] — kapanış, komisyon üzerinden muhasebeye yansır
- [[Modul-Diger-Finansal-Kayitlar]] — eski/paralel finansal kayıt sistemleri
