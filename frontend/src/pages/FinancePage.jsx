// Finans: ofisin genel mali gorunumu (ciro, tahsilat, bekleyen odemeler,
// danisman bazli kazanc payi vb.). Icerik asamasinda dunyadaki/Turkiye'deki
// basarili emlak CRM'lerinin finans modulleri arastirilip en uygun ozet
// buraya eklenecek.
export default function FinancePage() {
  return (
    <div>
      <h2 className="dossier__name" style={{ marginBottom: 16 }}>Finans</h2>
      <div className="folder-panel">
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>
          Bu bölüm yakında detaylandırılacak: ofisin genel ciro/tahsilat özeti,
          bekleyen ödemeler ve danışman bazlı kazanç dağılımı burada yer alacak.
        </p>
      </div>
    </div>
  );
}
