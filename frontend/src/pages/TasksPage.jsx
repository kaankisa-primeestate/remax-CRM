// Gorevler: danismanin yapilacaklar listesi (arama yap, teklif hazirla,
// evrak topla vb.), musteri/portfoy kaydiyla iliskilendirilebilir gorevler.
export default function TasksPage() {
  return (
    <div>
      <h2 className="dossier__name" style={{ marginBottom: 16 }}>Görevler</h2>
      <div className="folder-panel">
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>
          Bu bölüm yakında detaylandırılacak: müşteri/portföy kaydıyla ilişkilendirilebilen,
          tamamlanma durumu takip edilen bir yapılacaklar listesi burada yer alacak.
        </p>
      </div>
    </div>
  );
}
