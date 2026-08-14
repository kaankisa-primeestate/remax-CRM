// Ilan Entegrasyonu: portfoylerin sahibinden.com, hepsiemlak vb. harici
// ilan sitelerine otomatik gonderiminin yonetildigi ekran.
export default function ListingSyndicationPage() {
  return (
    <div>
      <h2 className="dossier__name" style={{ marginBottom: 16 }}>İlan Entegrasyonu</h2>
      <div className="folder-panel">
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>
          Bu bölüm yakında detaylandırılacak: portföylerin harici ilan sitelerine
          (Sahibinden, Hepsiemlak vb.) otomatik gönderimi burada yönetilecek.
        </p>
      </div>
    </div>
  );
}
