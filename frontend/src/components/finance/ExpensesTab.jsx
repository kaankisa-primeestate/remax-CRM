import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { expensesApi } from '../../api/expenses';
import { bankAccountsApi, formatMoney } from '../../api/bankAccounts';
import { usersApi } from '../../api/auth';
import ReceiptUploader from '../ReceiptUploader.jsx';

const PERIODS = [
  { value: 'month', label: 'Bu Ay' },
  { value: 'week', label: 'Bu Hafta' },
  { value: 'year', label: 'Bu Yıl' },
];

function periodRange(period) {
  const now = new Date();
  const to = now.toISOString().slice(0, 10);
  let fromDate;
  if (period === 'week') {
    fromDate = new Date(now);
    const day = fromDate.getDay();
    const diff = day === 0 ? -6 : 1 - day; // Pazartesi baslangicli hafta
    fromDate.setDate(fromDate.getDate() + diff);
  } else if (period === 'year') {
    fromDate = new Date(now.getFullYear(), 0, 1);
  } else {
    fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
  }
  return { from: fromDate.toISOString().slice(0, 10), to };
}

export default function ExpensesTab() {
  const navigate = useNavigate();
  const [summaryPeriod, setSummaryPeriod] = useState('month');
  const [summary, setSummary] = useState([]);
  const [summaryLoading, setSummaryLoading] = useState(true);

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    const { from, to } = periodRange(summaryPeriod);
    const data = await expensesApi.getSummary(from, to).catch(() => []);
    setSummary(data);
    setSummaryLoading(false);
  }, [summaryPeriod]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const [expenses, setExpenses] = useState([]);
  const [agents, setAgents] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [category, setCategory] = useState(''); // artik categoryId tutuyor
  const [categories, setCategories] = useState([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [addingCategory, setAddingCategory] = useState(false);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [vatRate, setVatRate] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [referenceNo, setReferenceNo] = useState('');
  const [bankAccountId, setBankAccountId] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState(null);
  const [saving, setSaving] = useState(false);

  // ÇOKLU DANIŞMAN YANSITMA VE ARAMA STATE'LERİ
  const [selectedAgentIds, setSelectedAgentIds] = useState([]);
  const [splitType, setSplitType] = useState('equal'); // 'equal' | 'custom'
  const [customAmounts, setCustomAmounts] = useState({});
  const [agentSearchQuery, setAgentSearchQuery] = useState('');
  const [isAgentMenuOpen, setIsAgentMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const loadCategories = useCallback(async () => {
    const data = await expensesApi.listCategories().catch(() => []);
    setCategories(data);
    if (data.length > 0) {
      setCategory((prev) => prev || data[0].id);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const [expData, agentData, accData] = await Promise.all([
      expensesApi.list(),
      usersApi.listAgents().catch(() => []),
      bankAccountsApi.list().catch(() => []),
    ]);
    setExpenses(expData);
    setAgents(agentData);
    setAccounts(accData);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    loadCategories();
  }, [load, loadCategories]);

  async function handleAddCategory() {
    if (!newCategoryName.trim()) return;
    setAddingCategory(true);
    try {
      const created = await expensesApi.createCategory(newCategoryName.trim());
      setCategories((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name, 'tr')));
      setCategory(created.id);
      setNewCategoryName('');
    } catch {
      alert('Kategori eklenemedi, tekrar deneyin.');
    } finally {
      setAddingCategory(false);
    }
  }

  // Menü dışına tıklandığında açılır menüyü kapat
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsAgentMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function resetForm() {
    setCategory(categories.length > 0 ? categories[0].id : '');
    setTitle('');
    setAmount('');
    setVatRate('');
    setDate(new Date().toISOString().slice(0, 10));
    setReferenceNo('');
    setBankAccountId('');
    setIsRecurring(false);
    setReceiptUrl(null);
    setSelectedAgentIds([]);
    setSplitType('equal');
    setCustomAmounts({});
    setAgentSearchQuery('');
  }

  function handleAgentToggle(id) {
    if (selectedAgentIds.includes(id)) {
      setSelectedAgentIds(selectedAgentIds.filter((item) => item !== id));
      const nextCustom = { ...customAmounts };
      delete nextCustom[id];
      setCustomAmounts(nextCustom);
    } else {
      setSelectedAgentIds([...selectedAgentIds, id]);
    }
  }

  function handleCustomAmountChange(id, val) {
    setCustomAmounts({
      ...customAmounts,
      [id]: val,
    });
  }

  const filteredAgents = agents.filter((ag) =>
    ag.name.toLowerCase().includes(agentSearchQuery.toLowerCase())
  );

  async function handleAdd(e) {
    e.preventDefault();
    if (!title.trim() || !amount || Number(amount) <= 0) return;
    setSaving(true);

    const totalAmount = Number(amount);
    let chargebacks = [];

    if (selectedAgentIds.length > 0) {
      if (splitType === 'equal') {
        const perAgent = Math.round((totalAmount / selectedAgentIds.length) * 100) / 100;
        chargebacks = selectedAgentIds.map((agentId) => ({
          agentId,
          amount: perAgent,
        }));
      } else {
        chargebacks = selectedAgentIds.map((agentId) => ({
          agentId,
          amount: Number(customAmounts[agentId]) || 0,
        }));
      }
    }

    try {
      await expensesApi.create({
        categoryId: category,
        title: title.trim(),
        amount: totalAmount,
        vatRate: vatRate ? Number(vatRate) : undefined,
        date,
        referenceNo: referenceNo.trim() || undefined,
        bankAccountId: bankAccountId || undefined,
        chargebacks: chargebacks.length > 0 ? chargebacks : undefined,
        isRecurring,
        receiptUrl: receiptUrl || undefined,
      });
      resetForm();
      load();
      loadSummary();
    } catch {
      alert('Gider eklenemedi, tekrar deneyin.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Bu gider silinsin mi? (Bağlı banka hareketi ve cari kaydı varsa onlar da silinecek)')) return;
    setExpenses((prev) => prev.filter((x) => x.id !== id));
    try {
      await expensesApi.remove(id);
      load();
      loadSummary();
    } catch {
      alert('Gider silinemedi, sayfa yenileniyor.');
      load();
    }
  }

  return (
    <>
      <div className="folder-panel" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', margin: 0, fontSize: 16 }}>📊 Kategori Özeti — Nereye Ne Harcadım?</h3>
          <div style={{ display: 'flex', gap: 6 }}>
            {PERIODS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setSummaryPeriod(p.value)}
                style={{
                  fontSize: 11, fontFamily: 'var(--font-mono)', padding: '4px 10px', borderRadius: 999,
                  border: '1px solid var(--paper-line)', cursor: 'pointer',
                  background: summaryPeriod === p.value ? 'var(--ink-navy)' : 'transparent',
                  color: summaryPeriod === p.value ? 'white' : 'var(--muted)',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        {summaryLoading ? (
          <div className="empty-state">Yükleniyor…</div>
        ) : summary.length === 0 ? (
          <div className="empty-state">Bu dönemde henüz bir gider kaydı yok.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
            {summary.map((s) => {
              const changePercent = s.previousTotal > 0 ? Math.round(((s.total - s.previousTotal) / s.previousTotal) * 100) : null;
              const isSpike = changePercent != null && changePercent >= 30;
              return (
                <button
                  type="button"
                  key={s.categoryId}
                  onClick={() => navigate(`/giderler/${s.categoryId}?period=${summaryPeriod}`)}
                  style={{
                    textAlign: 'left', padding: 14, borderRadius: 8, cursor: 'pointer',
                    border: isSpike ? '1px solid var(--danger)' : '1px solid var(--paper-line)',
                    background: isSpike ? '#fbeeeb' : 'white',
                  }}
                >
                  <div style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>
                    {s.label} {isSpike && '⚠️'}
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>{formatMoney(s.total)}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                    {s.count} kalem
                    {changePercent != null && (
                      <span style={{ color: isSpike ? 'var(--danger)' : 'inherit' }}> · {changePercent >= 0 ? '+' : ''}{changePercent}% önceki döneme göre</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="folder-panel" style={{ marginBottom: 20 }}>
        <h3 style={{ fontFamily: 'var(--font-display)', marginTop: 0, fontSize: 16 }}>Yeni Gider Ekle</h3>
        <form onSubmit={handleAdd} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-field" style={{ margin: 0 }}>
            <label>Kategori</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="form-field" style={{ margin: 0, minWidth: 150 }}>
            <label>+ Yeni Kategori</label>
            <div style={{ display: 'flex', gap: 4 }}>
              <input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Örn: Akaryakıt"
                style={{ width: 110 }}
              />
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleAddCategory}
                disabled={addingCategory || !newCategoryName.trim()}
                style={{ padding: '6px 10px', fontSize: 12 }}
              >
                Ekle
              </button>
            </div>
          </div>
          <div className="form-field" style={{ margin: 0, minWidth: 160 }}>
            <label>Açıklama</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Örn: Ağustos Kirası" />
          </div>
          <ReceiptUploader value={receiptUrl} onChange={setReceiptUrl} label="Fiş / Fatura Ekle" />
          <div className="form-field" style={{ margin: 0 }}>
            <label>Tutar (KDV dahil)</label>
            <input type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="form-field" style={{ margin: 0, maxWidth: 100 }}>
            <label>KDV % (opsiyonel)</label>
            <input type="number" min="0" max="100" value={vatRate} onChange={(e) => setVatRate(e.target.value)} placeholder="20" />
          </div>
          <div className="form-field" style={{ margin: 0 }}>
            <label>Tarih</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="form-field" style={{ margin: 0, minWidth: 120 }}>
            <label>Fiş/Fatura No</label>
            <input value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} placeholder="Opsiyonel" />
          </div>
          <div className="form-field" style={{ margin: 0, minWidth: 160 }}>
            <label>Banka Hesabı (opsiyonel)</label>
            <select value={bankAccountId} onChange={(e) => setBankAccountId(e.target.value)}>
              <option value="">Seçilmedi</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>{acc.bankName ? `${acc.bankName} — ${acc.accountName}` : acc.accountName}</option>
              ))}
            </select>
          </div>

          <div className="form-field full" style={{ flexDirection: 'row', alignItems: 'center', gap: 8, margin: 0 }}>
            <input type="checkbox" checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)} style={{ width: 'auto' }} />
            <label style={{ textTransform: 'none', fontFamily: 'var(--font-body)', fontSize: 13 }}>Sabit Gider (her ay tekrar eden)</label>
          </div>

          {/* ARAMALI VE AÇILIR MENÜLÜ ÇOKLU DANIŞMAN YANSITMA ALANI */}
          <div className="form-field full" ref={menuRef} style={{ marginTop: 10, padding: 12, border: '1px solid var(--paper-line, #e2e8f0)', borderRadius: 6, background: '#f8fafc', position: 'relative' }}>
            <label style={{ fontSize: 13, fontWeight: 'bold', marginBottom: 6, display: 'block' }}>👥 Danışmanlara Masraf Yansıt (Opsiyonel)</label>
            
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setIsAgentMenuOpen(!isAgentMenuOpen)}
                style={{ background: '#fff', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: 4, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <span>🔍 Danışman Seç / Ara</span>
                {selectedAgentIds.length > 0 && (
                  <span style={{ background: '#2563eb', color: '#fff', padding: '1px 6px', borderRadius: 10, fontSize: 11, fontWeight: 'bold' }}>
                    {selectedAgentIds.length} Seçildi
                  </span>
                )}
                <span style={{ fontSize: 10 }}>▼</span>
              </button>

              {/* Seçilen Danışmanların Rozetleri */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {selectedAgentIds.map((id) => {
                  const ag = agents.find((a) => a.id === id);
                  return (
                    <span key={id} style={{ background: '#dbeafe', color: '#1e40af', padding: '2px 8px', borderRadius: 4, fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                      {ag?.name}
                      <b onClick={() => handleAgentToggle(id)} style={{ cursor: 'pointer', marginLeft: 2, color: '#ef4444' }}>✕</b>
                    </span>
                  );
                })}
              </div>
            </div>

            {/* AÇILIR LİSTE (DROPDOWN MODAL) */}
            {isAgentMenuOpen && (
              <div style={{ position: 'absolute', top: '100%', left: 12, zIndex: 100, width: 320, background: '#fff', border: '1px solid #cbd5e1', borderRadius: 6, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)', padding: 10, marginTop: 4 }}>
                <input
                  type="text"
                  placeholder="Danışman adı ara..."
                  value={agentSearchQuery}
                  onChange={(e) => setAgentSearchQuery(e.target.value)}
                  style={{ width: '100%', padding: '6px 10px', borderRadius: 4, border: '1px solid #cbd5e1', fontSize: 12, marginBottom: 8 }}
                  autoFocus
                />

                <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {filteredAgents.length === 0 ? (
                    <div style={{ fontSize: 12, color: '#94a3b8', padding: 6, textAlign: 'center' }}>Danışman bulunamadı</div>
                  ) : (
                    filteredAgents.map((ag) => {
                      const isSelected = selectedAgentIds.includes(ag.id);
                      return (
                        <label key={ag.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 4, background: isSelected ? '#f1f5f9' : 'transparent', cursor: 'pointer', fontSize: 13 }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleAgentToggle(ag.id)}
                            style={{ width: 'auto' }}
                          />
                          {ag.name}
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* BÖLÜŞTÜRME HESAPLAMA ALANI */}
            {selectedAgentIds.length > 0 && (
              <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px dashed #cbd5e1' }}>
                <div style={{ display: 'flex', gap: 15, marginBottom: 8, fontSize: 12 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                    <input type="radio" name="splitType" checked={splitType === 'equal'} onChange={() => setSplitType('equal')} style={{ width: 'auto' }} />
                    <strong>Eşit Böl</strong> ({amount ? (Number(amount) / selectedAgentIds.length).toFixed(2) : 0} ₺ / kişi)
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                    <input type="radio" name="splitType" checked={splitType === 'custom'} onChange={() => setSplitType('custom')} style={{ width: 'auto' }} />
                    <strong>Özel Tutar Gir</strong>
                  </label>
                </div>

                {splitType === 'custom' && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8, marginTop: 8 }}>
                    {selectedAgentIds.map((agId) => {
                      const agentObj = agents.find((a) => a.id === agId);
                      return (
                        <div key={agId} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                          <span style={{ minWidth: 80, fontWeight: 500 }}>{agentObj?.name}:</span>
                          <input
                            type="number"
                            placeholder="₺ Tutar"
                            value={customAmounts[agId] || ''}
                            onChange={(e) => handleCustomAmountChange(agId, e.target.value)}
                            style={{ padding: '2px 6px', fontSize: 12, width: 80 }}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          <button type="submit" className="btn btn-primary" disabled={saving || !title.trim() || !amount} style={{ marginTop: 10 }}>
            {saving ? 'Ekleniyor…' : '+ Gider Ekle'}
          </button>
        </form>
      </div>

      <div className="folder-panel">
        {loading ? (
          <div className="empty-state">Yükleniyor…</div>
        ) : expenses.length === 0 ? (
          <div className="empty-state">Henüz gider eklenmemiş.</div>
        ) : (
          <div className="table-scroll">
            <table style={{ width: '100%', minWidth: 700, borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase' }}>
                  <th style={{ padding: '6px 8px' }}>Tarih</th>
                  <th style={{ padding: '6px 8px' }}>Kategori</th>
                  <th style={{ padding: '6px 8px' }}>Açıklama</th>
                  <th style={{ padding: '6px 8px' }}>Tutar</th>
                  <th style={{ padding: '6px 8px' }}>Danışman / Yansıtma</th>
                  <th style={{ padding: '6px 8px' }}></th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((exp) => {
                  const catLabel = categories.find((c) => c.id === exp.categoryId)?.name || exp.category || '—';
                  return (
                    <tr key={exp.id} style={{ borderTop: '1px solid var(--paper-line)' }}>
                      <td style={{ padding: '8px' }}>{new Date(exp.date).toLocaleDateString('tr-TR')}</td>
                      <td style={{ padding: '8px' }}>{catLabel}{exp.isRecurring && ' 🔁'}</td>
                      <td style={{ padding: '8px' }}>
                        {exp.title}
                        {exp.referenceNo && <span style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 11 }}> · {exp.referenceNo}</span>}
                      </td>
                      <td style={{ padding: '8px', fontFamily: 'var(--font-mono)', color: 'var(--danger)' }}>
                        {formatMoney(exp.amount)}
                        {exp.vatRate != null && <span style={{ color: 'var(--muted)', fontSize: 11 }}> (KDV %{exp.vatRate})</span>}
                      </td>
                      <td style={{ padding: '8px' }}>
                        {exp.chargebacks && exp.chargebacks.length > 0 ? (
                          exp.chargebacks.map((cb, idx) => {
                            const ag = agents.find((a) => a.id === cb.agentId);
                            return (
                              <span key={idx} style={{ display: 'inline-block', background: '#e0f2fe', color: '#0369a1', padding: '1px 5px', borderRadius: 3, fontSize: 11, marginRight: 4 }}>
                                {ag ? ag.name : 'Danışman'}: {formatMoney(cb.amount)}
                              </span>
                            );
                          })
                        ) : exp.agentId ? (
                          <span>
                            {agents.find((a) => a.id === exp.agentId)?.name || 'Danışman'}
                            {exp.chargebackPercentage > 0 && <span style={{ color: 'var(--muted)', fontSize: 11 }}> (%{exp.chargebackPercentage})</span>}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td style={{ padding: '8px' }}>
                        <button type="button" className="task-row__delete" onClick={() => handleDelete(exp.id)} title="Sil">✕</button>
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
  );
}
