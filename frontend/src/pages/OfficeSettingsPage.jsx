// Ofis Ayarlari: ofis bilgileri, marka/renk ayarlari, bildirim tercihleri
// ve genel sistem ayarlarinin yonetildigi ekran.
export default function OfficeSettingsPage() {
  return (
    <div>
      <h2 className="dossier__name" style={{ marginBottom: 16 }}>Ofis Ayarları</h2>
      <div className="folder-panel">
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>
          Bu bölüm yakında detaylandırılacak: ofis bilgileri, bildirim tercihleri ve
          genel sistem ayarları burada yönetilecek.
        </p>
      </div>
    </div>
  );
}
