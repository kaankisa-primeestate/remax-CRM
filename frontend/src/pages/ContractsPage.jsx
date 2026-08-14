// Sozlesmeler & Tapu: aktif sozlesmelerin bitis tarihlerini, vekaletname
// durumlarini ve tapu surecinin asamalarini takip eden ekran.
export default function ContractsPage() {
  return (
    <div>
      <h2 className="dossier__name" style={{ marginBottom: 16 }}>Sözleşmeler & Tapu</h2>
      <div className="folder-panel">
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>
          Bu bölüm yakında detaylandırılacak: sözleşme bitiş tarihleri, vekaletname durumları
          ve tapu sürecinin aşamaları burada takip edilecek.
        </p>
      </div>
    </div>
  );
}
