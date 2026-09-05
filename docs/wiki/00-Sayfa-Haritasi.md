---
tags: [frontend, route-haritasi]
---

# Sayfa Haritası

Tüm route'lar `frontend/src/App.jsx` içinde tanımlı. 🔒 işareti `brokerOnly` (sadece Broker erişebilir) anlamına gelir.

## Herkese Açık (Kimlik Doğrulama Gerektirmeyen) Sayfalar

| Route | Sayfa | Amaç |
|---|---|---|
| `/ilan/:id` | `PublicPropertyPage` | Bir portföyün herkese açık ilan görünümü |
| `/onay/:token` | `PublicDisclosurePage` | Yer Gösterme Belgesi dijital imza sayfası |
| `/belge/:token` | `PublicDocumentPage` | Genel dijital belge imza sayfası (Yetkilendirme Sözleşmesi vb.) |
| `/login` | `LoginPage` | Giriş |
| `/sifremi-unuttum` | `ForgotPasswordPage` | Şifre sıfırlama talebi |
| `/sifre-sifirla` | `ResetPasswordPage` | Şifre sıfırlama (token ile) |

Detay için bkz. [[Modul-Dijital-Belgeler]].

## Giriş Gerektiren Sayfalar

| Route | Sayfa | Modül |
|---|---|---|
| `/` | (yönlendirme: Broker → `/dashboard`, Danışman → `/panelim`) | — |
| `/musteriler`, `/musteriler/:id` | `CustomerListPage`, `CustomerDetailPage` | [[Modul-Musteri]] |
| `/portfoyler`, `/portfoyler/:id` | `PropertyListPage`, `PropertyDetailPage` | [[Modul-Portfoy]] |
| `/komisyonlar` | `CommissionsPage` | [[Modul-Komisyon-ve-Hakedis]] |
| `/sifre-degistir` | `ChangePasswordPage` | [[Modul-Kullanicilar-ve-Yetkilendirme]] |
| `/dashboard` 🔒 | `DashboardPage` | Broker genel bakış |
| `/panelim` | `AgentDashboardPage` | Danışman kendi paneli |
| `/talepler` | `RequestsPage` | [[Modul-Esletirme]] ("Sıcak Fırsatlar") |
| `/islemler`, `/islemler/:id` | `TransactionsPage`, `TransactionDetailPage` | [[Modul-Islemler]] |
| `/muhasebe` 🔒 | `AccountingPage` | [[Modul-Muhasebe]] |
| `/takvim` | `CalendarPage` | [[Modul-Takvim-ve-Randevular]] |
| `/gorevler` | `TasksPage` | [[Modul-Gorevler-ve-Duyurular]] |
| `/piyasa` | `MarketPage` | Piyasa haberleri |
| `/degerleme`, `/degerleme/yeni`, `/degerleme/:id` | `ValuationsListPage`, `ValuationWizardPage` | [[Modul-Degerleme]] |
| `/giderler/:categoryId` | `ExpenseCategoryDetailPage` | [[Modul-Muhasebe]] |
| `/cari-hesap/:agentId` | `AgentLedgerStatementPage` | [[Modul-Diger-Finansal-Kayitlar]] |
| `/cari-hesabim` | (Danışman kendi cari hesabı) | [[Modul-Diger-Finansal-Kayitlar]] |
| `/aidatlar` | `AgentDuesPage` | [[Modul-Diger-Finansal-Kayitlar]] |
| `/danismanlar` 🔒 | `AgentsPage` | [[Modul-Kullanicilar-ve-Yetkilendirme]] |
| `/sozlesmeler` 🔒 | `ContractsPage` | [[Modul-Dijital-Belgeler]] ("Sözleşmeler & Tapu") |
| `/hukuk` 🔒 | `LegalPage` | Hukuk/İhtarname (henüz boş sayfa) |
| `/ilan-entegrasyon` 🔒 | `ListingSyndicationPage` | İlan sitelerine yayın (henüz boş sayfa) |
| `/ayarlar` 🔒 | `OfficeSettingsPage` | Ofis Ayarları (henüz boş sayfa) |

## Boş/İskelet Sayfalar (Henüz İçerik Yok)

- `/hukuk` — Hukuk/İhtarname
- `/ilan-entegrasyon` — İlan sitelerine (Sahibinden, Emlakjet vb.) otomatik yayın
- `/ayarlar` — Ofis Ayarları

Bu üçü, sol menüde görünür ama henüz işlevsel değil.
