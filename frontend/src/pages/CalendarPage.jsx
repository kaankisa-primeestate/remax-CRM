// Takvim: danismanin randevularini (musteri gorusmeleri, ilan gosterimleri
// vb.) gunluk/haftalik/aylik gorunumde takip ettigi ekran.
export default function CalendarPage() {
  return (
    <div>
      <h2 className="dossier__name" style={{ marginBottom: 16 }}>Takvim</h2>
      <div className="folder-panel">
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>
          Bu bölüm yakında detaylandırılacak: müşteri görüşmeleri ve ilan gösterimlerini
          içeren günlük/haftalık/aylık bir takvim görünümü burada yer alacak.
        </p>
      </div>
    </div>
  );
}
