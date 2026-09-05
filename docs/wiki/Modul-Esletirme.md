---
tags: [modul, esletirme, sicak-firsatlar]
---

# Modül: Eşleştirme ("Sıcak Fırsatlar")

**Backend:** `backend/src/matching/` (`matching.service.ts`, `matching.controller.ts` — kendi entity'si yok, [[Modul-Musteri]] ve [[Modul-Portfoy]] üzerinden çalışır)
**Frontend:** `RequestsPage.jsx` (route: `/talepler`)

## Amaç

Müşteri kayıtları ile aktif portföyler arasında otomatik eşleşme bulup yüzdesel bir "sıcaklık" skoru üretir. bkz. [[00-Tasarim-Kararlari]] "Sıcak Fırsatlar Eşleştirmesi" bölümü için tasarım felsefesi.

## Algoritma — Tek Kelime Havuzu Mantığı

**Önemli:** Yapısal alanlar (bütçe, ilçe, oda sayısı, deniz manzarası isteği) ile serbest metin (Notlar/Gereksinimler) **ayrı ayrı** değerlendirilmez. İkisi de tek bir "metin havuzuna" dönüştürülür:

- `buildCustomerSearchText(customer)`: `requirements` + `notes` + `preferredDistricts` + `preferredRooms` + (varsa "deniz manzara" / "metro yakın" sabit ifadeleri) + `propertyInterest`
- `buildPropertySearchText(property)`: `title` + `district` + `neighborhood` + `rooms` + `view` + `facade` + `heatingType` + `deedStatus` + `notes` + (varsa "havuz", "spor salonu" vb. sabit ifadeler)

Bu iki metin, `extractKeywords()` ile kelimelere ayrılır (Türkçe normalize edilir: ı→i, ğ→g, ü→u, ş→s, ö→o, ç→c; STOPWORDS listesi elenir; 3 harften kısa kelimeler atılır).

## Türkçe Kök/Önek Toleranslı Eşleştirme

`wordsMatch(a, b)` fonksiyonu, **tam eşitlik yerine** önek karşılaştırması yapar:
- İki kelime de en az 4 harfse VE ortak önekleri en az 5 harfse eşleşir
- Örnek: `"manzarali"` ↔ `"manzarasi"` (ortak önek "manza") → eşleşir
- Örnek: `"asansorlu"` ↔ `"asansor"` → eşleşir
- Yanlış pozitif koruması: `"kadikoy"` ↔ `"kadin"` (önek çok kısaymış gibi görünse de 5 harf eşiği bunu engeller) → eşleşmez

## Skor Hesabı

```
score = (eşleşen kelime sayısı / müşterinin toplam kelime sayısı) × 100
```
`MIN_SCORE = 40` — bu eşiğin altındaki sonuçlar gösterilmez. `matchedCount >= 1` şartı da aranır.

## Bütçe Filtresi (Ayrı, Sayısal)

Kelime eşleştirmesine dahil edilmez. `isAffordable()`: `property.price <= customer.budget * 1.5` ise geçer (esnek bir üst sınır).

## Kapsam ve Mahremiyet

- **Sadece `PropertyStatus.ACTIVE`** portföyler taranır (Onay Bekleyen/Pasif/Satılmış hariç).
- `findAllHotMatches()`: **tüm ofis** (tüm danışmanların müşterisi × tüm danışmanların portföyü) taranır — `agentId` filtresi **yok**.
- Sonuç gösterimi: Broker tüm sonuçları görür; Danışman sadece `customer.agentId === kendisi` VEYA `property.agentId === kendisi` olan satırları görür.
- Bu, [[00-Tasarim-Kararlari]]'ndaki "tarama kapsamı ile gösterim filtresi ayrımı" kararının somut uygulamasıdır.

## Bilgi Tamlığı / Güven Skoru

`computeConfidence()`, müşteri ve mülk profillerinin ne kadar "dolu" olduğunu (checklist bazlı, örn. bütçe girilmiş mi, ilçe seçilmiş mi) ayrı bir `confidenceScore`/`confidenceLevel` (`high`/`medium`/`low`) olarak hesaplar — bu, eşleşme skorundan **bağımsız** bir gösterge, kullanıcıya "bu sonuca ne kadar güvenebilirim" fikrini verir.

## Bilinen Geçmiş Sorun (Referans)

Önceki bir sürüm, sadece serbest metin + `includes()` tabanlı tam eşleşme kullanıyordu; bu, Türkçe ek farklılıklarında (örn. "manzaralı" ≠ "manzarası") başarısız oluyordu ve `agentId` filtresi taramayı daraltıyordu. Bu, tamamen yeniden yazıldı — yukarıdaki tasarım, düzeltilmiş halidir.
