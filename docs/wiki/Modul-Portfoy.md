---
tags: [modul, portfoy]
---

# Modül: Portföy

**Backend:** `backend/src/portfolios/` (entity adı `Property`, tablo `properties`)
**Frontend:** `PropertyListPage.jsx`, `PropertyDetailPage.jsx`, `PublicPropertyPage.jsx`, `components/PropertyWizardModal.jsx`

## Veri Modeli (Property)

Temel alanlar: `title`, `propertyType`, `listingType`, `province`, `district`, `neighborhood`, `areaM2`, `price`, `priceCurrency`, `deedStatus`, `mortgageEligible`, `contractEndDate`, `revisionNote`, `ownerName`, `ownerPhone`, `rooms`, `bathrooms`, `floor`, `heatingType`, `dues`, `hasPool`, `hasGym`, `hasSecurity`, `hasParking`, `nearMetro`, `view`, `facade`, `buildingAge`, `status`, `statusChangedAt`, `photoUrls`, `notes`, `extraAttributes` (jsonb, esnek alan), `agentId`

### PropertyType (kategori)

`apartment` (Konut), `land` (Arsa), `field` (Tarla), `commercial` (İşyeri), `timeshare` (Devre Mülk), `villa`, `office` (Plaza/Ofis), `building` (Komple Bina), `project`, `hotel`

### ListingType

`sale` (Satılık), `rent` (Kiralık)

### PropertyStatus — Onay Akışı

```
pending_approval (yeni ilan, Broker onayı bekliyor)
        │
        ├─→ needs_revision (Broker revizyon istedi) → tekrar pending_approval
        │
        └─→ active (Broker onayladı)
                  │
                  ├─→ sold
                  ├─→ rented
                  └─→ passive
```

Bir portföy `active` olmadan [[Modul-Esletirme]] (Sıcak Fırsatlar) motoruna dahil edilmez.

## Kategori Bazlı Esnek Alanlar

`frontend/src/data/categoryFields.js` içindeki `CATEGORY_FIELDS` objesi, her `PropertyType` için **farklı** bir alan listesi tanımlar (örn. Arsa'da "Ada/Parsel" varken Konut'ta "Oda Sayısı" var). Bu alanların çoğu `extra: true` işaretlidir ve `Property.extraAttributes` (jsonb) alanında saklanır, entity şemasına yeni sütun eklemeden genişletilebilir.

Konut (apartment) kategorisine sonradan eklenen alanlar (Yetkilendirme Sözleşmesi için gerekli): Ada No, Parsel No, Bağımsız Bölüm No, Sahiplik Oranı, İpotek Detayı, Haciz Bilgisi, İmar/İskan Durumu, Jeneratör, Soğutma, Toplu Taşıma, oda bazında m² dökümü (Salon/Mutfak/Antre/Balkon/Tuvalet).

`PropertyWizardModal.jsx`, `CATEGORY_FIELDS[draft.propertyType]`'a göre formu **dinamik olarak** oluşturur — yeni bir alan eklemek için sadece bu diziye satır eklemek yeterlidir, form kodu değişmez.

## Onay Bildirimleri

- Portföy `pending_approval` olunca Broker'a bildirim gider (`property_pending_approval`), tıklanınca ilgili portföye yönlendirir.
- Broker onaylayıp `active` yapınca, Danışman'a "Portföyünüz onaylandı" bildirimi gider (`property_approved`) — son 14 gün içinde `active`'e geçmiş kendi portföyleri taranarak üretilir (bkz. [[Modul-Bildirimler]]).

## Mahremiyet ("Ofis Portföyü" Duvarı)

Broker her zaman düzenleyebilir. Danışman sadece **kendi** ilanını düzenleyebilir/silebilir/durumunu değiştirebilir — başka bir danışmanın portföyünde bu butonlar gizlenir (`canEdit = isBroker || property.agentId === user?.id`).

## İlgili Modüller

- [[Modul-Dijital-Belgeler]] — Yetkilendirme Sözleşmesi, portföyün `ownerName`/`ownerPhone` ve `extraAttributes` verisini otomatik doldurur
- [[Modul-Esletirme]] — Sıcak Fırsatlar, sadece `active` portföyleri tarar
- [[Modul-Islemler]] — Bir portföy kapanışa gidince Transaction oluşur
