import { useEffect, useState, useCallback } from 'react';
import { partnersApi } from '../../api/partners';
import { formatMoney } from '../../api/bankAccounts';

function currentPeriod() {
  return new Date().toISOString().slice(0, 7);
}

export default function PartnersTab() {
  const [partners, setPartners] = useState([]);
  const [balances, setBalances] = useState({});
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [history, setHistory] = useState({});

  const [name, setName] = useState('');
  const [sharePercentage, setSharePercentage] = useState('');
  const [saving, setSaving] = useState(false);

  const [adjType, setAdjType] = useState('credit');
  const [adjAmount, setAdjAmount] = useState('');
  const [adjDescription, setAdjDescription] = useState('');
  const [adjDate, setAdjDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [adjSaving, setAdjSaving] = useState(false);

  const [showDistribute, setShowDistribute] = useState(false);
  const [distributePeriod, setDistributePeriod] = useState(currentPeriod());
  const [distributeAmount, setDistributeAmount] = useState('');
  const [distributeSaving, setDistributeSaving] = useState(false);
  const [distributeError, setDistributeError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [partnerData, balanceData] = await Promise.all([
      partnersApi.list(),
      partnersApi.getSummary().catch(() => ({})),
    ]);
    setPartners(partnerData);
    setBalances(balanceData);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const totalShare = partners.filter((p) => p.isActive).reduce((sum, p) => sum + Number(p.sharePercentage), 0);

  async function handleAddPartner(e) {
    e.preventDefault();
    if (!name.trim() || sharePercentage === '') return;
    setSaving(true);
    try {
      await partnersApi.create({ name: name.trim(), sharePercentage: Number(sharePercentage) });
      setName('');
      setSharePercentage('');
      load();
    } catch {
      alert('Ortak eklenemedi, tekrar deneyin.');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(partner) {
    try {
      await partnersApi.update(partner.id, { isActive: !partner.isActive });
      load();
    } catch {
      alert('Güncellenemedi, tekrar deneyin.');
    }
  }

  async function handleDelete(id) {
    if (!confirm('Bu ortak silinsin mi? (Hareket geçmişi de silinir)')) return;
    try {
      await partnersApi.remove(id);
      load();
    } catch {
      alert('Silinemedi, tekrar deneyin.');
    }
  }

  async function toggleHistory(partnerId) {
    if (expandedId === partnerId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(partnerId);
    if (!history[partnerId]) {
      const h = await partnersApi.getHistory(partnerId);
      setHistory((prev) => ({ ...prev, [partnerId]: h }));
    }
  }

  function resetAdjForm() {
    setAdjType('credit');
    setAdjAmount('');
    setAdjDescription('');
    setAdjDate(new Date().toISOString().slice(0, 10));
  }

  async function handleAddAdjustment(partnerId) {
    if (!adjAmount || Number(adjAmount) <= 0 || !adjDescription.trim()) return;
    setAdjSaving(true);
    try {
      await partnersApi.addAdjustment(partnerId, {
        type: adjType,
        amount: Number(adjAmount),
        description: adjDescription.trim(),
        date: adjDate,
      });
      resetAdjForm();
      const h = await partnersApi.getHistory(partnerId);
      setHistory((prev) => ({ ...prev, [partnerId]: h }));
      load();
    } catch {
      alert('Kayıt eklenemedi, tekrar deneyin.');
    } finally {
      setAdjSaving(false);
    }
  }

  async function handleDistribute() {
    if (!distributeAmount || Number(distributeAmount) === 0) return;
    setDistributeError(null);
    setDistributeSaving(true);
    try {
      await partnersApi.distributeProfit({
        period: distributePeriod,
        netProfitAmount: Number(distributeAmount),
      });
      setShowDistribute(false);
      setDistributeAmount('');
      load();
    } catch (err) {
      setDistributeError(err?.response?.data?.message || 'Dağıtım yapılamadı.');
    } finally {
      setDistributeSaving(false);
    }
  }

  return (
    <>
      <div className="folder-panel" style={{ marginBottom: 20 }}>
        <h3 style={{ fontFamily: 'var(--font-display)', marginTop: 0, fontSize: 16 }}>Yeni Ortak Ekle</h3>
        <form onSubmit={handleAddPartner} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-field" style={{ margin: 0, minWidth: 160 }}>
            <label>Ad Soyad</label>
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="form-field" style={{ margin: 0 }}>
            <label>Hisse Oranı %</label>
            <input type="number" min="0" max="100" step="0.1" value={sharePercentage} onChange={(e) => setSharePercentage(e.target.value)} style={{ width: 90 }} />
          </div>
          <button type="submit" className="btn btn-primary" disabled={saving || !name.trim() || sharePercentage === ''}>
            {saving ? 'Ekleniyor…' : '+ Ortak Ekle'}
          </button>
        </form>
        {partners.length > 0 && (
          <p style={{ fontSize: 12, color: Math.abs(totalShare - 100) > 0.01 ? 'var(--danger)' : 'var(--muted)', marginTop: 10, marginBottom: 0 }}>
            Aktif ortakların hisse toplamı: %{totalShare.toFixed(2)} {Math.abs(totalShare - 100) > 0.01 && '— kâr dağıtımı için %100 olmalı!'}
          </p>
        )}
      </div>

      <div className="folder-panel" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', margin: 0, fontSize: 16 }}>Kâr Dağıtımı</h3>
          <button type="button" className="btn btn-primary" onClick={() => setShowDistribute((v) => !v)}>
            {showDistribute ? 'Vazgeç' : '💰 Bu Ayın Kârını Dağıt'}
          </button>
        </div>
        {showDistribute && (
          <div style={{ marginTop: 14, padding: 14, background: 'var(--paper)', borderRadius: 8 }}>
            <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 0 }}>
              Net kârı kendi muhasebenden hesaplayıp buraya tek bir rakam olarak gir — sistem bunu otomatik hesaplamaya çalışmaz, sadece aktif ortakların hisselerine göre doğru şekilde bölüştürür.
            </p>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div className="form-field" style={{ margin: 0 }}>
                <label>Dönem</label>
                <input type="month" value={distributePeriod} onChange={(e) => setDistributePeriod(e.target.value)} />
              </div>
              <div className="form-field" style={{ margin: 0 }}>
                <label>Net Kâr Tutarı</label>
                <input type="number" step="0.01" value={distributeAmount} onChange={(e) => setDistributeAmount(e.target.value)} style={{ width: 150 }} />
              </div>
              <button type="button" className="btn btn-primary" disabled={distributeSaving || !distributeAmount} onClick={handleDistribute}>
                {distributeSaving ? 'Dağıtılıyor…' : 'Dağıt'}
              </button>
            </div>
            {distributeAmount && partners.filter((p) => p.isActive).length > 0 && (
              <div style={{ marginTop: 10, fontSize: 12, color: 'var(--muted)' }}>
                {partners.filter((p) => p.isActive).map((p) => (
                  <div key={p.id}>{p.name}: {formatMoney((Number(distributeAmount) * Number(p.sharePercentage)) / 100)} (%{p.sharePercentage})</div>
                ))}
              </div>
            )}
            {distributeError && <div className="form-error" style={{ marginTop: 10 }}>{distributeError}</div>}
          </div>
        )}
      </div>

      <div className="folder-panel">
        {loading ? (
          <div className="empty-state">Yükleniyor…</div>
        ) : partners.length === 0 ? (
          <div className="empty-state">Henüz ortak eklenmemiş.</div>
        ) : (
          partners.map((partner) => {
            const balance = balances[partner.id] ?? 0;
            const partnerHistory = history[partner.id] || [];
            return (
              <div key={partner.id} className="ledger-agent-card" style={{ opacity: partner.isActive ? 1 : 0.5 }}>
                <div className="ledger-agent-card__header" onClick={() => toggleHistory(partner.id)}>
                  <div>
                    <div className="ledger-agent-card__name">{partner.name}</div>
                    <div className="ledger-agent-card__email">Hisse: %{partner.sharePercentage}{!partner.isActive && ' · Pasif'}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className={`ledger-agent-card__balance${balance > 0 ? ' is-owed' : balance < 0 ? ' is-owing' : ''}`}>
                      {balance > 0 && `Ofis borçlu: ${formatMoney(balance)}`}
                      {balance < 0 && `Ortak borçlu: ${formatMoney(Math.abs(balance))}`}
                      {balance === 0 && 'Bakiye: —'}
                    </div>
                    <span style={{ color: 'var(--muted)' }}>{expandedId === partner.id ? '▲' : '▼'}</span>
                  </div>
                </div>

                {expandedId === partner.id && (
                  <div className="ledger-agent-card__body">
                    <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                      <button type="button" className="btn btn-secondary" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => handleToggleActive(partner)}>
                        {partner.isActive ? 'Pasifleştir' : 'Aktifleştir'}
                      </button>
                      <button type="button" className="btn btn-secondary" style={{ fontSize: 11, padding: '4px 10px', color: 'var(--danger)' }} onClick={() => handleDelete(partner.id)}>
                        Ortağı Sil
                      </button>
                    </div>

                    <h4 style={{ fontFamily: 'var(--font-display)', fontSize: 14, margin: '0 0 10px' }}>Manuel Kayıt Ekle</h4>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 16 }}>
                      <div className="form-field" style={{ margin: 0 }}>
                        <label>Tür</label>
                        <select value={adjType} onChange={(e) => setAdjType(e.target.value)}>
                          <option value="credit">Kâr Payı / Sermaye İadesi (bakiye artar)</option>
                          <option value="debit">Sermaye Çekişi / Avans (bakiye azalır)</option>
                        </select>
                      </div>
                      <div className="form-field" style={{ margin: 0 }}>
                        <label>Tutar</label>
                        <input type="number" min="0.01" step="0.01" value={adjAmount} onChange={(e) => setAdjAmount(e.target.value)} style={{ width: 110 }} />
                      </div>
                      <div className="form-field" style={{ margin: 0, minWidth: 160 }}>
                        <label>Açıklama</label>
                        <input value={adjDescription} onChange={(e) => setAdjDescription(e.target.value)} />
                      </div>
                      <div className="form-field" style={{ margin: 0 }}>
                        <label>Tarih</label>
                        <input type="date" value={adjDate} onChange={(e) => setAdjDate(e.target.value)} />
                      </div>
                      <button type="button" className="btn btn-primary" style={{ fontSize: 12, padding: '6px 12px' }} disabled={adjSaving || !adjAmount || !adjDescription.trim()} onClick={() => handleAddAdjustment(partner.id)}>
                        {adjSaving ? 'Ekleniyor…' : '+ Kayıt Ekle'}
                      </button>
                    </div>

                    <h4 style={{ fontFamily: 'var(--font-display)', fontSize: 14, margin: '0 0 10px' }}>Hareket Geçmişi</h4>
                    {partnerHistory.length === 0 ? (
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>Henüz hareket yok.</div>
                    ) : (
                      partnerHistory.map((item) => (
                        <div key={item.id} className="ledger-history-item">
                          <span style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{new Date(item.date).toLocaleDateString('tr-TR')}</span>
                          <span style={{ flex: 1 }}>{item.description}</span>
                          <span style={{ fontFamily: 'var(--font-mono)', color: item.type === 'credit' ? 'var(--success)' : 'var(--danger)' }}>
                            {item.type === 'credit' ? '+' : '−'}{formatMoney(item.amount)}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </>
  );
}
