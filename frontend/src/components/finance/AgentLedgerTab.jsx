import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { agentLedgerApi } from '../../api/agentLedger';
import { usersApi } from '../../api/auth';

function money(n) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(n || 0);
}

// Sadece bir liste + bakiye ozeti -- detayli ekstre (tarih/aciklama/borc/
// alacak/bakiye, yuruyen bakiyeli) ARTIK AYRI BIR SAYFADA
// (AgentLedgerStatementPage) aciliyor, buraya sikismis bir inline
// panel degil.
export default function AgentLedgerTab() {
  const navigate = useNavigate();
  const [agents, setAgents] = useState([]);
  const [balances, setBalances] = useState({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [agentData, balanceData] = await Promise.all([
      usersApi.listAgents().catch(() => []),
      agentLedgerApi.getSummary().catch(() => ({})),
    ]);
    setAgents(agentData);
    setBalances(balanceData);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="folder-panel">
      <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 0, marginBottom: 16 }}>
        Detaylı ekstreyi (tarih/açıklama/borç/alacak/yürüyen bakiye) görmek için bir danışmana tıkla.
      </p>
      {loading ? (
        <div className="empty-state">Yükleniyor…</div>
      ) : agents.length === 0 ? (
        <div className="empty-state">Henüz danışman yok.</div>
      ) : (
        agents.map((agent) => {
          const balance = balances[agent.id] ?? 0;
          return (
            <div
              key={agent.id}
              className="record-row"
              style={{ cursor: 'pointer' }}
              onClick={() => navigate(`/cari-hesap/${agent.id}`)}
            >
              <span className="record-row__name">{agent.name}</span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 700,
                  fontSize: 13,
                  color: balance > 0 ? '#1e7a3d' : balance < 0 ? 'var(--danger)' : 'var(--muted)',
                }}
              >
                {balance > 0 && `Ofis Borçlu: ${money(balance)}`}
                {balance < 0 && `Danışman Borçlu: ${money(Math.abs(balance))}`}
                {balance === 0 && 'Bakiye: —'}
              </span>
            </div>
          );
        })
      )}
    </div>
  );
}
