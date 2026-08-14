// Talepler: müşterilerin ne aradığının (Hızlı Kayıt / Detaylı Kayıt'ta
// toplanan propertyInterest, preferredDistricts, budget, purchaseTimeline
// vb.) tek bir listede, aksiyon alınabilir şekilde gösterildiği ekran.
// İçerik aşamasında: aciliyet seviyesi, eşleşen portföy sayısı, son
// iletişim tarihi gibi filtrelenebilir/sıralanabilir bir tablo eklenecek.
export default function RequestsPage() {
  return (
    <div>
      <h2 className="dossier__name" style={{ marginBottom: 16 }}>Talepler</h2>
      <div className="folder-panel">
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>
          Bu bölüm yakında detaylandırılacak: tüm müşteri taleplerinin (ne arıyor, bütçe,
          bölge, aciliyet) tek bir listede görüldüğü, filtrelenebilir bir talep panosu
          burada yer alacak.
        </p>
      </div>
    </div>
  );
}
