// Hukuk / Ihtarname: hukuki takip gerektiren dosyalarin (ihtarname,
// sozlesme revizyonu, uyusmazlik vb.) listelendigi ekran.
export default function LegalPage() {
  return (
    <div>
      <h2 className="dossier__name" style={{ marginBottom: 16 }}>Hukuk / İhtarname</h2>
      <div className="folder-panel">
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>
          Bu bölüm yakında detaylandırılacak: ihtarname süreçleri, sözleşme revizyonları
          ve hukuki takip gerektiren dosyalar burada listelenecek.
        </p>
      </div>
    </div>
  );
}
