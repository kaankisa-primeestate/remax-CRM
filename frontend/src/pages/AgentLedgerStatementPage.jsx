import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { agentLedgerApi } from '../api/agentLedger';
import { usersApi } from '../api/auth';
import { useAuth } from '../context/AuthContext.jsx';

function firstDayOfMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}
function today() {
  return new Date().toISOString().slice(0, 10);
}

const CATEGORY_META = {
  commission: { icon: '🎉', label: 'Komisyon Hakedişi' },
  commission_payment: { icon: '💸', label: 'Ofis Ödemesi' },
  agent_due: { icon: '🏠', label: 'Aylık Ofis Aidatı' },
  expense_chargeback: { icon: '📸', label: 'Masraf Yansıtma' },
  manual: { icon: '💵', label: 'Manuel Kayıt' },
};

function money(n) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(n || 0);
}

// Bireysel Cari Ekstre: tek bir danismanin, secili tarih araligindaki tum
// finansal hareketlerini (komisyon hakedisi, aidat, masraf yansitmasi,
// odeme, manuel kayit) kronolojik ve YURUYEN BAKIYELI olarak gosteren
// AYRI, TAM bir sayfa -- Broker'in bir danismana tiklayip actigi VEYA
// danismanin kendi panelinden ("Cari Hesabım") kendi ekstresini gordugu
// TEK ortak bilesen.
export default function AgentLedgerStatementPage() {
  const { agentId: paramAgentId } = useParams();
  const { user, isBroker } = useAuth();
  const navigate = useNavigate();
  const agentId = paramAgentId || user?.id;
  const isOwnStatement = agentId === user?.id;

  const [agentInfo, setAgentInfo] = useState(null);
  const [fromDate, setFromDate] = useState(firstDayOfMonth());
  const [toDate, setToDate] = useState(today());
  const [statement, setStatement] = useState(null);
  const [loading, setLoading] = useState(true);

  const [showAddForm, setShowAddForm] = useState(false);
  const [adjType, setAdjType] = useState('debit');
  const [adjAmount, setAdjAmount] = useState('');
  const [adjDescription, setAdjDescription] = useState('');
  const [adjDate, setAdjDate] = useState(today());
  const [adjSaving, setAdjSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await agentLedgerApi.getStatement(agentId, fromDate, toDate);
      setStatement(data);
    } catch {
      setStatement(null);
    } finally {
      setLoading(false);
    }
  }, [agentId, fromDate, toDate]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (isBroker && paramAgentId && paramAgentId !== user?.id) {
      usersApi
        .listAgents()
        .then((agents) => setAgentInfo(agents.find((a) => a.id === paramAgentId) || null))
        .catch(() => setAgentInfo(null));
    }
  }, [isBroker, paramAgentId, user?.id]);

  const displayName = agentInfo?.name || (isOwnStatement ? user?.name : 'Danışman');

  function resetAdjForm() {
    setAdjType('debit');
    setAdjAmount('');
    setAdjDescription('');
    setAdjDate(today());
  }

  async function handleAddAdjustment() {
    if (!adjAmount || Number(adjAmount) <= 0 || !adjDescription.trim()) return;
    setAdjSaving(true);
    try {
      await agentLedgerApi.createAdjustment({
        agentId,
        type: adjType,
        amount: Number(adjAmount),
        description: adjDescription.trim(),
        date: adjDate,
      });
      resetAdjForm();
      setShowAddForm(false);
      load();
    } catch {
      alert('Kayıt eklenemedi, tekrar deneyin.');
    } finally {
      setAdjSaving(false);
    }
  }

  function handleWhatsApp() {
    if (!agentInfo?.phone || !statement) return;
    const text = `Sayın ${displayName}, ${new Date().toLocaleDateString('tr-TR')} itibarıyla hesabınızda ${money(statement.summary.totalCredit)} hakediş, ${money(statement.summary.totalDeductions)} kesinti/avans ve ${money(statement.summary.totalPayments)} ödeme kaydı bulunmaktadır. Net bakiyeniz: ${money(statement.summary.netBalance)}.`;
    const phone = agentInfo.phone.replace(/\D/g, '');
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => navigate(-1)}
        style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--muted)', background: 'transparent', border: 'none', padding: 0, marginBottom: 12, cursor: 'pointer', display: 'block' }}
      >
        ← Geri Dön
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
        <h2 className="dossier__name" style={{ margin: 0 }}>💳 Cari Hesap Ekstresi: {displayName}</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-secondary" onClick={() => window.print()}>
            🖨️ Yazdır / PDF Kaydet
          </button>
          {isBroker && agentInfo?.phone && (
            <button type="button" className="btn btn-secondary" onClick={handleWhatsApp}>
              💬 WhatsApp'tan Gönder
            </button>
          )}
          {isBroker && (
            <button type="button" className="btn btn-primary" onClick={() => setShowAddForm((v) => !v)}>
              + Yeni Cari Hareket Ekle
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', marginBottom: 16 }}>
        <div className="form-field" style={{ margin: 0 }}>
          <label>Başlangıç</label>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </div>
        <div className="form-field" style={{ margin: 0 }}>
          <label>Bitiş</label>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </div>
      </div>

      {showAddForm && isBroker && (
        <div className="folder-panel" style={{ marginBottom: 20 }}>
          <h4 style={{ fontFamily: 'var(--font-display)', marginTop: 0 }}>Yeni Cari Hareket</h4>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div className="form-field" style={{ margin: 0 }}>
              <label>Tür</label>
              <select value={adjType} onChange={(e) => setAdjType(e.target.value)}>
                <option value="debit">Avans / Ceza (bakiye azalır)</option>
                <option value="credit">Danışman Ofis Adına Ödedi (bakiye artar)</option>
              </select>
            </div>
            <div className="form-field" style={{ margin: 0 }}>
              <label>Tutar</label>
              <input type="number" min="0.01" step="0.01" value={adjAmount} onChange={(e) => setAdjAmount(e.target.value)} style={{ width: 110 }} />
            </div>
            <div className="form-field" style={{ margin: 0, minWidth: 200 }}>
              <label>Açıklama</label>
              <input value={adjDescription} onChange={(e) => setAdjDescription(e.target.value)} />
            </div>
            <div className="form-field" style={{ margin: 0 }}>
              <label>Tarih</label>
              <input type="date" value={adjDate} onChange={(e) => setAdjDate(e.target.value)} />
            </div>
            <button type="button" className="btn btn-primary" disabled={adjSaving || !adjAmount || !adjDescription.trim()} onClick={handleAddAdjustment}>
              {adjSaving ? 'Ekleniyor…' : 'Kaydet'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="empty-state">Yükleniyor…</div>
      ) : !statement ? (
        <div className="empty-state">Ekstre alınamadı.</div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 20 }}>
            <div style={{ flex: 1, minWidth: 150, padding: '12px 16px', background: '#e6f4ea', borderRadius: 8 }}>
              <div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>Toplam Hakediş</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#1e7a3d' }}>{money(statement.summary.totalCredit)}</div>
            </div>
            <div style={{ flex: 1, minWidth: 150, padding: '12px 16px', background: '#fdf3e0', borderRadius: 8 }}>
              <div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>Kesinti / Avans</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#8a6100' }}>{money(statement.summary.totalDeductions)}</div>
            </div>
            <div style={{ flex: 1, minWidth: 150, padding: '12px 16px', background: '#eef3f9', borderRadius: 8 }}>
              <div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>Yapılan Ödeme</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink-navy)' }}>{money(statement.summary.totalPayments)}</div>
            </div>
            <div style={{ flex: 1, minWidth: 150, padding: '12px 16px', background: statement.summary.netBalance >= 0 ? '#e6f4ea' : '#fbeeeb', borderRadius: 8 }}>
              <div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>Net Bakiye</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: statement.summary.netBalance >= 0 ? '#1e7a3d' : 'var(--danger)' }}>
                {statement.summary.netBalance >= 0 ? 'Ofis Borçlu: ' : 'Danışman Borçlu: '}
                {money(Math.abs(statement.summary.netBalance))}
              </div>
            </div>
          </div>

          <div className="folder-panel">
            {statement.entries.length === 0 ? (
              <div className="empty-state">Bu tarih aralığında hareket yok.</div>
            ) : (
              <div className="table-scroll">
                <table style={{ width: '100%', minWidth: 640, borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ textAlign: 'left', color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase' }}>
                      <th style={{ padding: '8px' }}>Tarih</th>
                      <th style={{ padding: '8px' }}>Açıklama</th>
                      <th style={{ padding: '8px', textAlign: 'right' }}>Borç</th>
                      <th style={{ padding: '8px', textAlign: 'right' }}>Alacak</th>
                      <th style={{ padding: '8px', textAlign: 'right' }}>Bakiye</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statement.entries.map((e, i) => {
                      const meta = CATEGORY_META[e.category] || { icon: '•', label: e.category };
                      return (
                        <tr key={i} style={{ borderTop: '1px solid var(--paper-line)' }}>
                          <td style={{ padding: '8px', whiteSpace: 'nowrap' }}>{new Date(e.date).toLocaleDateString('tr-TR')}</td>
                          <td style={{ padding: '8px' }}>{meta.icon} {e.label}</td>
                          <td style={{ padding: '8px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: e.debit ? 'var(--danger)' : 'var(--muted)' }}>
                            {e.debit ? money(e.debit) : '—'}
                          </td>
                          <td style={{ padding: '8px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: e.credit ? 'var(--success)' : 'var(--muted)' }}>
                            {e.credit ? money(e.credit) : '—'}
                          </td>
                          <td style={{ padding: '8px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: e.runningBalance >= 0 ? '#1e7a3d' : 'var(--danger)' }}>
                            {e.runningBalance >= 0 ? '+' : '−'}{money(Math.abs(e.runningBalance))}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
