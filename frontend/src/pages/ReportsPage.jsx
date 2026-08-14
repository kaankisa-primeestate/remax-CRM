// Raporlar: Dashboard'daki ozet kartlardan farkli olarak, danisman
// bazinda veya tarih araligina gore detayli, disari aktarilabilir
// (PDF/Excel) raporlarin uretildigi ekran.
export default function ReportsPage() {
  return (
    <div>
      <h2 className="dossier__name" style={{ marginBottom: 16 }}>Raporlar</h2>
      <div className="folder-panel">
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>
          Bu bölüm yakında detaylandırılacak: danışman bazlı veya tarih aralığına göre
          filtrelenebilir, dışa aktarılabilir performans raporları burada yer alacak.
        </p>
      </div>
    </div>
  );
}
