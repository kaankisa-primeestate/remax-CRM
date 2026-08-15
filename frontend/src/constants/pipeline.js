// Musteri surec asamalari (Kanban panosu ve musteri detay sayfasinda
// ayni anahtarlari kullanir). Sadece burasi degistirilerek etiketler
// her yerde guncellenir -- veritabaninda anahtar (key) sabit kalir,
// sadece gorunen isim degisir. Ileride kolayca yeniden adlandirilabilir.
export const PIPELINE_STAGES = [
  { key: 'new_contact', label: 'İlk Temas' },
  { key: 'active', label: 'Aktif Süreç' },
  { key: 'offer', label: 'Teklif / Pazarlık' },
  { key: 'completed', label: 'Tamamlandı' },
];
