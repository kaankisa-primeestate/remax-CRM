import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { PartyPopper, Send, Home, Receipt, Wallet, Circle, CreditCard, FileText, MessageCircle, BarChart3, ChevronRight, ArrowLeft } from 'lucide-react';
import { EmptyState, TableSkeleton } from '../components/Feedback';
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
  commission: { Icon: PartyPopper, label: 'Komisyon Hakedişi' },
  commission_payment: { Icon: Send, label: 'Ofis Ödemesi' },
  agent_due: { Icon: Home, label: 'Aylık Ofis Aidatı' },
  expense_chargeback: { Icon: Receipt, label: 'Masraf Yansıtma' },
  manual: { Icon: Wallet, label: 'Manuel Kayıt' },
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
  const [pdfDownloading, setPdfDownloading] = useState(false);

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
    } else if (isOwnStatement) {
      // Kendi ekstremi goruntulerken de Prim Modeli rozetini gosterebilmek
      // icin kendi tam profilimi cekiyoruz (login yanitinda sadece
      // ad/email/rol var, komisyon bilgisi yok).
      usersApi.getMe().then(setAgentInfo).catch(() => setAgentInfo(null));
    }
  }, [isBroker, paramAgentId, user?.id, isOwnStatement]);

  const displayName = agentInfo?.name || (isOwnStatement ? user?.name : 'Danışman');

  const commissionModelLabel = (() => {
    if (!agentInfo) return null;
    if (agentInfo.tierCommissionRules && agentInfo.tierCommissionRules.length > 0) {
      const rates = agentInfo.tierCommissionRules.map((t) => `%${t.rate}`).join(' – ');
      return `Kademeli (${rates})`;
    }
    if (agentInfo.commissionShareType === 'percentage' && agentInfo.commissionSharePercentage != null) {
      return `Sabit Oran (%${agentInfo.commissionSharePercentage})`;
    }
    if (agentInfo.commissionShareType) {
      return agentInfo.commissionShareType;
    }
    return null;
  })();

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

  async function handleDownloadPdf() {
    setPdfDownloading(true);
    try {
      await agentLedgerApi.downloadStatementPdf(agentId, fromDate, toDate, `cari-ekstre-${displayName.replace(/\s+/g, '-')}`);
    } catch {
      alert('PDF indirilemedi, tekrar deneyin.');
    } finally {
      setPdfDownloading(false);
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
      <nav className="cl-breadcrumb cl-breadcrumb--detail" aria-label="Sayfa yolu">
        <button type="button" className="cl-back" onClick={() => navigate(-1)}>
          <ArrowLeft size={14} strokeWidth={2} aria-hidden="true" /> Geri
        </button>
        <Link to="/">Ana Sayfa</Link>
        <ChevronRight size={14} strokeWidth={2} aria-hidden="true" />
        <span aria-current="page">Cari Hesap Ekstresi</span>
      </nav>

      <div className="cl-page-header">
        <div className="cl-page-header__text">
          <h2 className="cl-page-title">Cari Hesap Ekstresi</h2>
          <p className="cl-page-subtitle">{displayName}</p>
        </div>
        <div className="cl-page-controls">
          <button type="button" className="btn btn-secondary" disabled={pdfDownloading} onClick={handleDownloadPdf}>
            {pdfDownloading ? 'Hazırlanıyor…' : (<><FileText size={16} strokeWidth={2} /> PDF İndir</>)}
          </button>
          {isBroker && agentInfo?.phone && (
            <button type="button" className="btn btn-secondary" onClick={handleWhatsApp} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <MessageCircle size={14} /> WhatsApp'tan Gönder
            </button>
          )}
          {isBroker && (
            <button type="button" className="btn btn-primary" onClick={() => setShowAddForm((v) => !v)}>
              + Yeni Cari Hareket Ekle
            </button>
          )}
        </div>
      </div>
      {commissionModelLabel && (
        <div style={{ marginBottom: 16 }}>
          <span
            style={{
              fontFamily: 'var(--font-body)',
              fontWeight: 600,
              fontSize: 11,
              background: 'rgba(16, 35, 61, 0.06)',
              color: 'var(--cl-primary-800)',
              borderRadius: 999,
              padding: '4px 10px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <BarChart3 size={12} /> Prim Modeli: {commissionModelLabel}
          </span>
        </div>
      )}

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
          <h4 style={{ fontFamily: 'var(--cl-font-heading)', marginTop: 0 }}>Yeni Cari Hareket</h4>
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
        <TableSkeleton rows={5} columns={4} label="Ekstre yükleniyor…" />
      ) : !statement?.summary ? (
        <EmptyState Icon={CreditCard} title="Ekstre alınamadı" note="Bağlantıyı kontrol edip sayfayı yenileyin." />
      ) : (
        <>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 20 }}>
            <div style={{ flex: 1, minWidth: 150, padding: '12px 16px', background: 'rgba(21, 154, 99, 0.08)', borderRadius: 10 }}>
              <div style={{ fontSize: 10, color: 'var(--cl-muted)', fontFamily: 'var(--font-body)', fontWeight: 600, textTransform: 'uppercase' }}>Toplam Hakediş</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--cl-success)' }}>{money(statement.summary.totalCredit)}</div>
            </div>
            <div style={{ flex: 1, minWidth: 150, padding: '12px 16px', background: 'rgba(196, 154, 85, 0.12)', borderRadius: 10 }}>
              <div style={{ fontSize: 10, color: 'var(--cl-muted)', fontFamily: 'var(--font-body)', fontWeight: 600, textTransform: 'uppercase' }}>Kesinti / Avans</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#8a6420' }}>{money(statement.summary.totalDeductions)}</div>
            </div>
            <div style={{ flex: 1, minWidth: 150, padding: '12px 16px', background: 'rgba(16, 35, 61, 0.06)', borderRadius: 10 }}>
              <div style={{ fontSize: 10, color: 'var(--cl-muted)', fontFamily: 'var(--font-body)', fontWeight: 600, textTransform: 'uppercase' }}>Yapılan Ödeme</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--cl-primary-800)' }}>{money(statement.summary.totalPayments)}</div>
            </div>
            <div style={{ flex: 1, minWidth: 150, padding: '12px 16px', background: statement.summary.netBalance >= 0 ? 'rgba(21, 154, 99, 0.08)' : 'rgba(214, 69, 69, 0.06)', borderRadius: 10 }}>
              <div style={{ fontSize: 10, color: 'var(--cl-muted)', fontFamily: 'var(--font-body)', fontWeight: 600, textTransform: 'uppercase' }}>Net Bakiye</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: statement.summary.netBalance >= 0 ? 'var(--cl-success)' : 'var(--cl-danger)' }}>
                {statement.summary.netBalance >= 0 ? 'Ofis Borçlu: ' : 'Danışman Borçlu: '}
                {money(Math.abs(statement.summary.netBalance))}
              </div>
            </div>
          </div>

          <div className="folder-panel">
            {statement.entries.length === 0 ? (
              <EmptyState Icon={Receipt} title="Bu tarih aralığında hareket yok" />
            ) : (
              <div className="table-scroll">
                <table className="data-table" style={{ minWidth: 640 }}>
                  <thead>
                    <tr>
                      <th>Tarih</th>
                      <th>Açıklama</th>
                      <th className="is-right">Borç</th>
                      <th className="is-right">Alacak</th>
                      <th className="is-right">Bakiye</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statement.entries.map((e, i) => {
                      const meta = CATEGORY_META[e.category] || { Icon: Circle, label: e.category };
                      return (
                        <tr key={i}>
                          <td data-label="Tarih">{new Date(e.date).toLocaleDateString('tr-TR')}</td>
                          <td data-label="Açıklama">
                            <span className="cell-with-icon">
                              <meta.Icon size={13} strokeWidth={2} /> {e.label}
                            </span>
                          </td>
                          <td data-label="Borç" className="amount is-right" style={{ color: e.debit ? 'var(--cl-danger)' : 'var(--cl-muted)' }}>
                            {e.debit ? money(e.debit) : '—'}
                          </td>
                          <td data-label="Alacak" className="amount is-right" style={{ color: e.credit ? 'var(--cl-success)' : 'var(--cl-muted)' }}>
                            {e.credit ? money(e.credit) : '—'}
                          </td>
                          <td data-label="Bakiye" className="amount is-right" style={{ fontWeight: 700, color: e.runningBalance >= 0 ? 'var(--cl-success)' : 'var(--cl-danger)' }}>
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
