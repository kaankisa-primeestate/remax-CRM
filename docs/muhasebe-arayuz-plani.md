# Muhasebe arayüz yenilemesi — durum ve kalan işler

Referans: kullanıcının verdiği PrimeCRM ekran görüntüsü + "PRIMECRM — MUHASEBE
UI/UX YENİLEME GELİŞTİRİCİ UYGULAMA TALİMATI" (37 madde).

## Çalışma kuralları (değişmez)

1. **Tek adım, tek değişiklik.** Her adımda: ölç → değiştir → tekrar ölç →
   ekran görüntüsü → commit → rapor et → onay bekle. Deneme yanılma yok.
2. **Tek responsive kod tabanı.** Ayrı mobil sürüm yazılmayacak; aynı CSS
   her cihazda çalışacak. Mobil = mobil tarayıcı, uygulama değil.
3. **Görsel katman.** İçerik ve veri mevcut CRM'den gelir, değiştirilmez.
4. **İşlevsiz kutu olmaz.** Ekrandaki her tıklanabilir alan bir şey yapmalı.
   Bizde karşılığı olmayan hiçbir öğe eklenmez; sorulmadan atlanabilir.
5. **Bozulmayacaklar:** backend, API, veritabanı, kimlik doğrulama, roller,
   muhasebe hesaplamaları, CRUD, sayfalama, filtreleme.
6. **Doğrulama zorunlu.** Değişiklik gerçek tarayıcıda 1920px ve 390px'te
   ölçülür; iddia sayıyla desteklenir. Ortak sınıf değiştiyse (`.btn`,
   `.cl-panel`, `.cl-tabs`) tüm sayfalar taranır.
7. Kullanıcı 1920px kullanıyor — ölçümler oradan yapılır.

## Biten adımlar (hepsi `main`'de, canlıda)

| # | Adım | Commit |
|---|------|--------|
| 1 | İçerik genişliği 1080 → 1600px (1920'de 294px ölü kenar boşluğu kalkt&#305;) | `f0ed38f8` |
| 2 | Form ızgarası sabit sütuna geçti (5/3/2/1), satırlar tam doluyor | `3edd1fad` |
| 3 | Tablo ölçüleri: satır 65 → 49px, başlık 12px/500; "Cari kart" ve "Açıklama" ayrı sütun oldu (veri kaybı düzeldi) | `ee7fa97d` |
| 4 | KPI kartları: ikon ortalı, sayı kart renginde, sağda gerçek veriden grafik; "Bekleyen İşlemler" kartı artık sıfır göstermiyor | `8a1d3c6d` |
| 5 | Sayfa başlığı: kırıntı yolu, başlık 30px, kontrol etiketleri yana alındı (2 hiza → 1 hiza), altın buton | `133a0a6c` |
| 6 | Sekme çubuğu: ölü eski tanım silindi, üç sayfada aynı ölçü, mobilde ikon üstte, kaybolan ikon düzeldi | `25b8d7c2` |
| — | Takvim "Bugün" butonu 390px'te taşıyordu (eski hata) | `2724db96` |
| 7 | Form paneli: buton ikon hizası, 48px eylem butonları, panel 24/12, Muhasebe'ye özel panel ölçüsü kaldırıldı | `b71147ce` |
| 8 | Hareket listesi: Tarih ve Tutar sütunlarında gerçek sıralama, mobilde sıralama kutusu | `515c4226` |
| 9 | Boş durum ve yükleme iskeleti bileşenleri (`components/Feedback.jsx`), çalışan eylem butonları | `d3ad2274` |
| 10 | Altı sekme aynı iskelete geçti: `PanelHead`, satır yüksekliği 80→48px, Cari Kartlar ortak araç çubuğu/sayfalama | `b3291c66` |
| 11 | Raporlar sekmesi ortak `.data-table`'a geçti, eski rapor tablosu CSS'i silindi, ikon/buton dili birleşti | `fbffd579` |
| 12 | İki kart sistemi tek dile geldi (`.metric-card` → belirteç), Genel Bakış sayfa başlığı ve dönem seçici | `de7621f2` |
| 13 | Portföy Havuzu: sayfa başlığı + kırıntı yolu, 11 sekmeye ikon, ortak araç çubuğu, boş/yükleme durumları | `a7379e8b` |
| 14 | Müşteri Havuzu aynı dönüşüm + Portföy/Müşteri Detay kırıntı yolu ve "Geri" düğmesi | `622ab2e5` |
| 16 | İşlemler + İşlem Detay: sayfa başlığı, segmentli seçici (`.segmented`), kanban kartı temizliği | `e99414cc` |
| 17 | Görevler, Sıcak Fırsatlar, Sözleşmeler: sayfa başlığı, panel başlığı, boş durumlar; işlevsiz panel kaldırıldı | `13927972` |
| 18 | Takvim: sayfa başlığı, görünüm sekmeleri kendi satırına, ajanda paneli ve boş durumlar | `8edd0f56` |
| 19 | **Üç panel sistemi tek ölçüde birleşti** (92 kullanım) + Piyasa ve Piyasa Değer Analizleri | `88c51072` |
| 20 | Değerleme sihirbazı + danışman tarafı (Panelim, Aidatlarım, Komisyonlar, Cari Hesabım) | `95d6241d` |
| — | **Portföy Havuzu galeri görünümü** (Liste / Galeri seçeneği, 4 sütun, Cloudinary küçültme, fotoğrafsızda yer tutucu) | `32523445` |
| — | **Müşteri Havuzu kart görünümü** (Liste / Kartlar, baş harf avatarı, tip rozeti, bütçe/zaman/bölge satırları) + eksik "Yatırımcı" rozet rengi | (bu commit) |

## Sıradaki adım

**21. adım iptal edildi.** Ofis Ayarları, Hukuk/İhtarname ve İlan
Entegrasyonu sayfalarının üçü de 15 satır ve içerikleri aynı: bir başlık
ve "Bu bölüm yakında detaylandırılacak" yazan gri bir paragraf. API
çağrısı, veri, tıklanacak alan yok. Görsel geçiş yapılacak bir şey
bulunmuyor; içerik geldiğinde ele alınacak. (Adımı satır içi stil
sayısına bakarak listeye almıştım, içlerine bakmamıştım.)

**Finans kaldırıldı** (aşağıya bakın).

Sırada **22 — son geçiş** var.

**22 — son geçiş:** kalan satır içi stiller, ölü CSS sınıfları
(`.accounting-data-table`, `.accounting-entry-form-grid`, `.cl-kpi-card`,
`.cl-kpi-row`), kırılım sayısını üçe indirme.

### Galeri/kart görünümü — not
- Görünüm tercihi `localStorage`'da, iki sayfa için **ayrı anahtar**:
  `primecrm.portfoy.gorunum` ve `primecrm.musteri.gorunum`.
- Sütun sayısı: 1920'de 4, ≤1439'da 3, ≤1199'da 2, ≤560'ta 1.
  (1200 altında üç sütun kartı 210px'e düşürüyordu, fotoğraf okunmuyordu.)
- **Yapıldı:** kiralık fiyatların sonuna "kira" ekleniyor
  (₺145.000 kira). Etiket sihirbazın ilk adımındaki Satılık/Kiralık
  seçiminden (`listingType`) geliyor, tutardan tahmin edilmiyor —
  yanlış etiket çıkması mümkün değil. Fiyat biçimlendirici üç yerde
  kopyalanmıştı (liste, detay, herkese açık ilan); tek ortak
  `formatPropertyPrice` yardımcısında birleşti.
- **Temizlik notu:** `TIMELINE_OPTIONS` iki ayrı dosyada kopyalanmış
  (`CustomerFormModal.jsx`, `QuickAddCustomerModal.jsx`) ve içerikleri
  farklı; bilerek birleştirilmedi, iki çalışan formu riske atmamak için.

### Finans kaldırıldı (14.09.2026)

Kullanıcı: *"finans aslında şu an aktif değil. Onu tamamen kaldırmak
istiyorum... her seferinde önümüze çıkıyor. Ben bunu sevmiyorum."*

**Bulgu:** Finans sayfası zaten rotaya bağlı değildi — `App.jsx` içinde
`/finans` rotası yok, `FinancePage` import bile edilmiyordu. 8 dosya,
~2.100 satır ölü kod.

**Kırık bağlantı:** Broker panosundaki "Akıllı Aksiyon Merkezi"nde
gecikmiş aidat kutusu `/finans`'a gidiyordu; tıklayınca tamamen boş
sayfa açılıyordu (tarayıcıda ölçüldü: 0 karakter). `/aidatlar`'a
çevrildi.

**Silinenler:** `pages/FinancePage.jsx`, `components/finance/` (7 dosya),
ve yalnızca onların kullandığı `api/cashFlow.js`, `api/chequeNotes.js`,
`api/partners.js`, `api/recurringExpenses.js`.

**Bilerek bırakılanlar:**
- `api/bankAccounts.js`, `api/expenses.js`, `api/agentLedger.js` —
  Aidatlar, Komisyonlar, Cari Hesabım ve Gider Kategorisi Detayı
  sayfalarında canlı kullanımda.
- `api/axios.js` — `bankAccounts.js` bunu kullanıyor.
- **Backend'in tamamı** (bank-accounts, cash-flow, cheque-notes,
  expenses, partners, recurring-expenses). Sebep: Muhasebe'nin "Finans
  Aktarım Önizlemesi" (`accounting-migration.service.ts`) bu tabloların
  hepsini okuyor. Modüller silinirse eski Finans verilerine erişen
  köprü de gider. Veriler duruyor, arayüz gitti.

### İkinci tur: eski Finans backend'i de kaldırıldı (14.09.2026)

Kullanıcı: *"Finans ile bağlantılı olan her şey eski. İçinde veri yok.
Veriler tamamen test amaçlı benim oluşturduklarım. Dolayısıyla hiç şüphe
duymadan ve korkmadan tamamını silebilirsin."*

**Silinenler (ikinci tur):**
- `pages/ExpenseCategoryDetailPage.jsx` + `/giderler/:categoryId` rotası
  (hiçbir yerden bağlantısı yoktu) ve `api/expenses.js`
- Backend modülleri: `cash-flow`, `partners`, `recurring-expenses`,
  `expenses`
- `accounting-migration.service.ts` + `/accounting/migration/preview`
  ucu + Muhasebe'deki "Finans Aktarım Önizlemesi" paneli ve
  `getMigrationPreview`. (Aktarılacak veri yoksa önizlemenin anlamı yok.)

**Kaldırılamayan iki modül — sebebi:** `bank-accounts` ve `cheque-notes`
ekranlarda görünmüyor ama **canlı iş mantığının içinde**:
- `commissions.service.ts` — komisyon çek/senetle ödendiğinde `ChequeNote`,
  nakit/banka ile ödendiğinde `BankTransaction` (çıkış) oluşturuyor.
- `agent-ledger.service.ts` — cari hesap çıkışı için `BankTransaction`.
- `agent-dues.service.ts` — aidat "Ödendi İşaretle" akışında hesap
  seçilince `BankTransaction` (giriş).
Ayrıca Aidatlar ve Komisyonlar sayfalarındaki "Ödendi İşaretle"
akışındaki hesap seçici bu tablodan besleniyor. Bunları silmek kod
temizliği değil, komisyon ödeme ve cari hesap mantığının yeniden
yazılması olur — Muhasebe'nin kendi `accounting-account` /
`accounting-entry` tablolarına taşınması gerekir. Ayrı bir iş olarak
duruyor.

**Not — veritabanı:** `DB_SYNCHRONIZE` varsayılanı `true`. Silinen
entity'lerin tabloları bir sonraki açılışta düşürülür. Kullanıcı
verilerin test verisi olduğunu belirtti.

**Karar bekleyen:** `AccountingPage.jsx` içindeki
`activeTab === 'migration'` bloğu artık yalnızca **"Muhasebe Temiz
Başlangıç"** panelini taşıyor. Ama `ACCOUNTING_TABS` listesinde
'migration' diye bir sekme yok ve `setActiveTab` hiçbir yerde bu değerle
çağrılmıyor — yani blok **hiç açılamıyor**. Temiz Başlangıç aracı
sekme çubuğuna bağlansın mı, yoksa o da silinsin mi?

### Bekleyen iki sayfa
- **Danışman Yönetimi** — kullanıcı 14.09'da sonraya bıraktı (101 stil).
- **İşlem Detayı** — 90 satır içi stille en ağır ikinci sayfa; adım 16'da
  yalnızca kırıntı yolu eklendi, iç düzeni hâlâ elden geçmedi.

---

## BEKLEYEN İŞ — Google Takvim entegrasyonu (tek yön: CRM → Google)

**Aciliyeti yok** (kullanıcı 14.09.2026'da böyle söyledi). Görsel iş
bitince ya da kullanıcı istediğinde yapılacak. Aşağıdaki kararlar
verilmiş durumda, sıfırdan konuşmaya gerek yok.

### Durum ve karar verilenler
- Yön: yalnızca CRM → Google. Google'dan CRM'e çekme yapılmayacak.
- Kapsam: `https://www.googleapis.com/auth/calendar.events`
- Her danışman kendi hesabını isteğe bağlı bağlar, istediğinde keser.
- Takvimdeki 7 olay türünden yalnızca **randevular** kullanıcı kaydı;
  diğer 6'sı CRM verisinden türetiliyor (görev, gösterim, teklif
  geçerliliği, komisyon vadesi, aidat, sözleşme bitişi). İlk sürümde
  yalnızca randevular gönderilecek.

### Kullanıcıdan beklenen (paralel yürüyor)
1. Google Cloud projesi + Calendar API etkinleştirme
2. OAuth izin ekranı — **Workspace varsa "Dahili" (onay gerekmez),
   kişisel Gmail ise "Harici" (Google doğrulaması, haftalar sürer)**
3. OAuth istemcisi (Web), yönlendirme adresi:
   `https://api.bu-crm.site/auth/google/callback`
4. Client ID / Secret **Render ortam değişkenlerine kullanıcı girecek**;
   koda yazılmayacak, sohbete de yazılmayacak.

**Cevap bekleyen soru:** danışmanlar şirket alan adıyla Google Workspace
mi kullanıyor, kişisel Gmail mi? Takvimi bu belirliyor.

### Yapılacak teknik iş
- `Appointment` kaydına süre/bitiş alanı (Google bitiş saati zorunlu
  istiyor; şu an sadece `date` + serbest metin `time` var).
- `googleEventId`, `googleCalendarId`, `syncedAt`, `syncStatus` alanları.
- Kullanıcı başına şifreli refresh token saklama.
- OAuth başlat/callback uçları, bağlantı kesme ucu.
- Randevu oluştur/güncelle/sil → Google'a yansıtma.
- Takvim sayfasına bağlantı durumu ve "Bağlan / Bağlantıyı kes" arayüzü.

**NOT: Test modunda refresh token 7 günde bir geçersiz oluyor — uygulama
yayınlanmadan gerçek kullanıma açılamaz.**

**BEKLEMEDE — 15: Danışman Yönetimi.** Kullanıcı bu sayfayı sonraya
bırakmak istedi (14. adımdan sonra). 101 satır içi stille en ağır ikinci
sayfa; `.cl-page-header` var ama kırıntı yolu ve `PanelHead` yok, üç
sekmesinde ikon yok. Sıra geldiğinde kullanıcıya sorulacak.

## Kalan sayfa sırası (adım tahmini)

| # | Adım | Sayfalar |
|---|---|---|
| 15 | Danışman Yönetimi | **beklemede** (kullanıcı isteği) |
| ~~16~~ | ~~İşlemler + İşlem Detay~~ | bitti |
| ~~17~~ | ~~Küçük listeler~~ | bitti |
| ~~18~~ | ~~Takvim~~ | bitti |
| ~~19~~ | ~~Piyasa + Değer Analizi listesi~~ | bitti |
| ~~20~~ | ~~Değerleme sihirbazı + danışman tarafı~~ | bitti |
| — | **Google Takvim entegrasyonu** | beklemede, aciliyeti yok |
| 21 | Küçük sayfalar | Ayarlar, Hukuk, İlan Entegrasyonu, Gider Kategorisi, Finans |
| 22 | Son geçiş | Kalan satır içi stiller, ölü CSS, kırılımları üçe indirme |

Not: Danışman Paneli (`/panelim`) adım 12'de kart sistemi üzerinden
dolaylı olarak düzeldi ama kendi sayfa başlığı hâlâ yok.

## Muhasebe'de kalanlar (daha sonra)

- Silme/iptal işlemi için onay kutusu (şu an doğrudan mı yapılıyor, bakılacak).
- Kayıt sonrası bildirim `SavedRecordNotice` olarak duruyor; toast'a
  çevrilecek mi, karar verilecek. Eklenirse gerçekten çalışmalı.
- Kalan satır içi stiller: AccountingPage'de 128 adet (başlangıçta 333).
  Tüm projede 1186 (oturum başında 1325).
  Bunlar durdukça tasarım sistemi sayfanın her yerine ulaşamıyor.
- Ölü CSS sınıfları (JSX'te hiç kullanılmıyor): `.accounting-data-table`
  (13 CSS / 0 JSX), `.accounting-entry-form-grid` (9/0), `.cl-kpi-card` (13/0),
  `.cl-kpi-row` (3/0).
- Kırılım sayısı ~10; talimattaki üçe indirilecek (1024 / 768 / 600).
- Komisyonlar, Kiralar ve Hesaplar sekmelerinde arama/filtre ve sayfalama
  yok; kayıt sayısı artınca gerekecek.

## Muhasebe bitince: diğer sayfalar

Sıra: Genel Bakış → Portföy Havuzu → Müşteri Havuzu → Danışman Yönetimi →
İşlemler → kalanlar.

Altyapı hazır: `.cl-page-header` + `.cl-breadcrumb`, `.cl-tabs`/`.folder-tabs`,
`.cl-panel`, `PanelHead` (`section-head` + `panel-head`), `.list-toolbar`, `.data-table`,
`EmptyState` / `TableSkeleton` (`components/Feedback.jsx`), `.pill`, `.cell-select`,
`.table-pager`, `.stat-grid`/`.stat-card`, `.form-grid`, `.btn`, `.pill`.
Bunlar `index.css` içindeki "BİLEŞEN SÖZLÜĞÜ" bölümünde tanımlı.

Her sayfada yapılacak: kırıntı yolu ekle, sekmelere ikon ver (Portföy'de 11,
Danışmanlar'da 3 sekmenin ikonu yok), tabloları `.data-table`'a taşı,
satır içi stilleri temizle (tüm uygulamada ~1568 adet).

## Doğrulama araçları

Oturum sonunda silinen geçici klasörde tutuldu; gerekirse yeniden yazılır.
Hepsi `playwright-core` + `/opt/pw-browsers/.../chrome` ile `frontend/dist`
üzerinde çalışır, oturumu ve API'yi taklit eder:

- `audit.mjs <genişlik>` — 15 sayfada yatay taşma **ve görünmeden kırpılan
  içerik** denetimi. (Sadece taşmaya bakmak yetmiyor: kırpılan içerik
  sayfa taşması üretmeden gizleniyor.)
- `btnaudit.mjs <genişlik>` — tüm sayfalardaki `.btn` ölçüleri.
- `kpi.mjs`, `baslik.mjs`, `sekme.mjs`, `form.mjs`, `tabloolcu.mjs` — bileşen ölçüleri.
- `siralama.mjs` — sıralamanın gerçekten çalıştığının davranış testi.
- `teshis.mjs` — bir kuralın neden kazandığını CDP ile bulur.

## Ders alınan hatalar

- **Ölü CSS tanımları tehlikeli.** Dosyada sonra gelen kural sessizce kazanıyor;
  tablo başlığında ve sekmelerde bu yüzden saatler kaybedildi. Bir bileşenin
  tek tanımı olmalı.
- **Satır içi stil sistemi yener.** Sınıf eklemek yetmez, `style={{}}`
  kaldırılmalı.
- **1440px'te test etmek yanıltıyor.** Kullanıcı 1920px kullanıyor.
- **Görsel kontrol yetmez.** 28px hamburger, 41px sekme, kaybolan ikon,
  kırpılan sayı — hepsi ölçümle bulundu, gözle değil.
