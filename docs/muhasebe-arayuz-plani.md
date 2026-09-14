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

## Sıradaki adım

**17 — Küçük listeler: Görevler, Sıcak Fırsatlar, Sözleşmeler.** Üçü de
benzer yapıda; tek adımda gidebilir.

**BEKLEMEDE — 15: Danışman Yönetimi.** Kullanıcı bu sayfayı sonraya
bırakmak istedi (14. adımdan sonra). 101 satır içi stille en ağır ikinci
sayfa; `.cl-page-header` var ama kırıntı yolu ve `PanelHead` yok, üç
sekmesinde ikon yok. Sıra geldiğinde kullanıcıya sorulacak.

## Kalan sayfa sırası (adım tahmini)

| # | Adım | Sayfalar |
|---|---|---|
| 15 | Danışman Yönetimi | **beklemede** (kullanıcı isteği) |
| ~~16~~ | ~~İşlemler + İşlem Detay~~ | bitti |
| 17 | Küçük listeler | Görevler, Sıcak Fırsatlar, Sözleşmeler |
| 18 | Takvim | |
| 19 | Piyasa + Değer Analizi (liste + sihirbaz) | 64, ağır |
| 20 | Danışman tarafı | Panelim, Aidatlarım, Cari Hesabım, Komisyonlar |
| 21 | Küçük sayfalar | Ayarlar, Hukuk, İlan Entegrasyonu, Gider Kategorisi, Finans |
| 22 | Son geçiş | Kalan satır içi stiller, ölü CSS, kırılımları üçe indirme |

Not: Danışman Paneli (`/panelim`) adım 12'de kart sistemi üzerinden
dolaylı olarak düzeldi ama kendi sayfa başlığı hâlâ yok.

## Muhasebe'de kalanlar (daha sonra)

- Silme/iptal işlemi için onay kutusu (şu an doğrudan mı yapılıyor, bakılacak).
- Kayıt sonrası bildirim `SavedRecordNotice` olarak duruyor; toast'a
  çevrilecek mi, karar verilecek. Eklenirse gerçekten çalışmalı.
- Kalan satır içi stiller: AccountingPage'de 128 adet `style={{}}` var
  (başlangıçta 333, adım 11 sonunda 128).
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
