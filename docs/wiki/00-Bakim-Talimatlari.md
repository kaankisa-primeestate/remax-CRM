---
tags: [surec, bakim]
---

# Bakım Talimatları

Bu sayfa, projeye yeni kod eklerken ve bu wiki'yi güncel tutarken izlenmesi gereken süreci anlatır.

## Kod Değişikliği Süreci

1. Her zaman `git checkout -- . && git clean -fd && git pull origin main` ile **temiz bir taban** alarak başla — asla eski/kirli bir sandbox durumuyla çalışma.
2. Değişiklik sonrası **mutlaka** hem backend (`npm run build` — NestJS derlemesi) hem frontend (`npm run build` — Vite derlemesi) test edilir, 0 hata olmalı.
3. Ek kontroller:
   - Süslü parantez dengesi (basit bir Python sayımıyla doğrulanabilir)
   - TypeORM modüllerinde `@InjectRepository` edilen her entity'nin ilgili `*.module.ts` dosyasındaki `TypeOrmModule.forFeature([...])` içinde kayıtlı olduğunun taranması
4. Kullanıcı iki farklı bilgisayarda çalışıyor (ofis: `/mnt/chromeos/MyFiles/Downloads`, ev: `/mnt/shared/MyFiles/Downloads`) — dosyalar oraya indirilip gerçek proje klasörüne kopyalanıyor, sonra `git add && git commit && git push` yapılıyor.
5. **Push edildi denilen hiçbir şey sorgusuz kabul edilmez.** Her zaman GitHub'dan bağımsız olarak çekilip: commit'in gerçekten var olduğu, dosya içeriğinin doğru olduğu, derlemenin geçtiği doğrulanır. (Geçmişte "hepsini yaptım, push ettim" denmiş ama commit GitHub'da hiç yoktu — bu adım asla atlanmaz.)
6. Manus AI'dan (projede kod geliştiren başka bir yapay zeka asistanı) gelen değişiklikler de aynı titizlikle denetlenir; eksik/hatalı çıkarsa `git revert --no-edit <commit>` ile geri alınır (force push değil, geçmiş bozulmadan).

## Bu Wiki'yi Güncel Tutma

Codebase her önemli değiştiğinde (yeni modül, yeni entity alanı, yeni mimari karar), ilgili wiki sayfası **aynı oturumda** güncellenmeli:

- **Yeni bir backend modülü eklendiğinde:** [[00-Genel-Mimari]] modül listesine eklenir, kendi `Modul-*.md` sayfası oluşturulur, [[index]]'e link eklenir.
- **Bir entity'ye yeni alan eklendiğinde:** ilgili modül sayfasındaki veri modeli bölümü güncellenir.
- **Yeni bir route/sayfa eklendiğinde:** [[00-Sayfa-Haritasi]] güncellenir.
- **Önemli bir mimari karar alındığında** (örn. "bundan sonra X hep Y şeklinde yapılacak"): [[00-Tasarim-Kararlari]]'na eklenir.
- **Bir özellik kaldırıldığında/geri alındığında:** ilgili sayfadan silinir, gerekirse [[00-Degisiklik-Gunlugu]]'na not düşülür.

## Wiki Yazım Kuralları

- Obsidian çift köşeli parantez sözdizimi kullanılır (örneğin `Modul-Portfoy` sayfasına link vermek için, köşeli parantez içine dosya adı yazılır), dosya adıyla birebir eşleşmeli (`.md` uzantısı olmadan).
- Her sayfa YAML frontmatter ile başlar (`tags: [...]`).
- Kod/dosya adları `code style` ile yazılır, gerçek dosya yoluyla (`backend/src/...`).
- Türkçe yazılır, teknik terimler (entity, endpoint, route) İngilizce kalabilir.
- Bir sayfa çok uzarsa (500+ satır), alt sayfalara bölünür.
