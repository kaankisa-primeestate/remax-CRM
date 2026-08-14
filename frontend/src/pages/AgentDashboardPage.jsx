import { useAuth } from '../context/AuthContext.jsx';

// "Bugün ne yapmalıyım?" odaklı Danışman paneli.
// Broker'ın genel Dashboard'undan (ofis performansı) farklı olarak,
// bu ekran danışmanın GÜNLÜK işlerine odaklanır. İçerik aşamasında
// eklenecekler: bugünkü ajanda, yeni eşleşmeler, aktif talepler,
// bugünkü görevler, haftalık performans grafiği.
export default function AgentDashboardPage() {
  const { user } = useAuth();
  const firstName = user?.name?.split(' ')[0] || '';

  return (
    <div>
      <h2 className="dossier__name" style={{ marginBottom: 4 }}>
        Merhaba{firstName ? `, ${firstName}` : ''} 👋
      </h2>
      <p style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 13, marginBottom: 24 }}>
        {new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
      </p>

      <div className="folder-panel">
        <h3 style={{ fontFamily: 'var(--font-display)', marginTop: 0 }}>Günlük Özet</h3>
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>
          Bu bölüm yakında detaylandırılacak: bugünkü ajanda, aktif müşteri/talep sayıları,
          yeni eşleşmeler, bugünkü görevler ve haftalık performans burada görünecek.
        </p>
      </div>
    </div>
  );
}
