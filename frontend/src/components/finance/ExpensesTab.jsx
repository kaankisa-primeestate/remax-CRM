import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, AlertTriangle, Repeat, Users, Search, ChevronDown, X, Settings } from 'lucide-react';
import { expensesApi } from '../../api/expenses';
import { recurringExpensesApi } from '../../api/recurringExpenses';
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

const currentPeriod = () => new Date().toISOString().slice(0, 7); // YYYY-MM

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
  const [paymentMethod, setPaymentMethod] = useState('account');
  const [chequeDueDate, setChequeDueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [chequeDrawerName, setChequeDrawerName] = useState('');
  const [receiptUrl, setReceiptUrl] = useState(null);
  const [saving, setSaving] = useState(false);

  // SABIT GIDER SABLONU (eskiden ayri "Sabit Giderler" sekmesindeydi,
  // artik Gider ekleme akisinin bir SECENEGI -- kullanici her ay ayni
  // bilgileri tekrar tekrar girmek yerine, daha once tanimlanmis bir
  // sablon uzerinden tek tikla islem yapabiliyor.
  const [expenseMode, setExpenseMode] = useState('single'); // 'single' | 'recurring'
  const [recurringTemplates, setRecurringTemplates] = useState([]);
  const [pendingRecurring, setPendingRecurring] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [newTemplateTitle, setNewTemplateTitle] = useState('');
  const [newTemplateCategory, setNewTemplateCategory] = useState('');
  const [newTemplateAmount, setNewTemplateAmount] = useState('');
  const [newTemplateDueDay, setNewTemplateDueDay] = useState('1');
  const [newTemplateBankAccountId, setNewTemplateBankAccountId] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false);

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

  const loadRecurring = useCallback(async () => {
    const [templates, pending] = await Promise.all([
      recurringExpensesApi.list().catch(() => []),
      recurringExpensesApi.getPending(currentPeriod()).catch(() => []),
    ]);
    setRecurringTemplates(templates);
    setPendingRecurring(pending);
  }, []);

  useEffect(() => {
    load();
    loadCategories();
    loadRecurring();
  }, [load, loadCategories, loadRecurring]);

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

  // Bir sablon secilince, formu o sablonun varsayilan degerleriyle
  // doldurur -- kullanici HALA hepsini degistirebilir.
  function handleSelectTemplate(templateId) {
    setSelectedTemplateId(templateId);
    const t = recurringTemplates.find((x) => x.id === templateId);
    if (!t) return;
    setCategory(t.categoryId || '');
    setTitle(t.title);
    setAmount(String(t.defaultAmount));
    setBankAccountId(t.defaultBankAccountId || '');
  }

  function handleModeChange(mode) {
    setExpenseMode(mode);
    if (mode === 'recurring' && recurringTemplates.length > 0 && !selectedTemplateId) {
      handleSelectTemplate(recurringTemplates[0].id);
    }
  }

  async function handleCreateTemplate() {
    if (!newTemplateTitle.trim() || !newTemplateAmount || Number(newTemplateAmount) <= 0 || !newTemplateCategory) return;
    setSavingTemplate(true);
    try {
      await recurringExpensesApi.create({
        title: newTemplateTitle.trim(),
        categoryId: newTemplateCategory,
        defaultAmount: Number(newTemplateAmount),
        dueDayOfMonth: Number(newTemplateDueDay),
        defaultBankAccountId: newTemplateBankAccountId || undefined,
      });
      setNewTemplateTitle('');
      setNewTemplateAmount('');
      setNewTemplateDueDay('1');
      setNewTemplateBankAccountId('');
      loadRecurring();
    } catch {
      alert('Şablon eklenemedi, tekrar deneyin.');
    } finally {
      setSavingTemplate(false);
    }
  }

  async function handleToggleTemplateActive(template) {
    try {
      await recurringExpensesApi.update(template.id, { isActive: !template.isActive });
      loadRecurring();
    } catch {
      alert('Güncellenemedi, tekrar deneyin.');
    }
  }

  async function handleDeleteTemplate(id) {
    if (!confirm('Bu sabit gider şablonu silinsin mi? (Geçmiş ödemeler etkilenmez)')) return;
    try {
      await recurringExpensesApi.remove(id);
      loadRecurring();
    } catch {
      alert('Silinemedi, tekrar deneyin.');
    }
  }

  function resetForm() {
    setCategory(categories.length > 0 ? categories[0].id : '');
    setTitle('');
    setAmount('');
    setVatRate('');
    setDate(new Date().toISOString().slice(0, 10));
    setReferenceNo('');
    setBankAccountId('');
    setPaymentMethod('account');
    setChequeDrawerName('');
    setReceiptUrl(null);
    setExpenseMode('single');
    setSelectedTemplateId('');
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
    if (expenseMode === 'recurring' && !selectedTemplateId) return;
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
      if (expenseMode === 'recurring') {
        // Sablondan odeme -- backend HEM gercek bir Expense kaydi
        // OLUSTURUR HEM sablonun bu ayki durumunu isaretler, boylece
        // cift kayit olusmaz, tum hareketler Giderler listesinde de gorunur.
        await recurringExpensesApi.pay(selectedTemplateId, {
          amount: totalAmount,
          date,
          bankAccountId: bankAccountId || undefined,
          referenceNo: referenceNo.trim() || undefined,
        });
      } else {
        await expensesApi.create({
          categoryId: category,
          title: title.trim(),
          amount: totalAmount,
          vatRate: vatRate ? Number(vatRate) : undefined,
          date,
          referenceNo: referenceNo.trim() || undefined,
          bankAccountId: bankAccountId || undefined,
          paymentMethod,
          chequeDueDate: paymentMethod !== 'account' ? chequeDueDate : undefined,
          chequeDrawerName: paymentMethod !== 'account' ? chequeDrawerName.trim() || undefined : undefined,
          chargebacks: chargebacks.length > 0 ? chargebacks : undefined,
          receiptUrl: receiptUrl || undefined,
        });
      }
      resetForm();
      load();
      loadSummary();
      loadRecurring();
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
          <h3 style={{ fontFamily: 'var(--cl-font-heading)', margin: 0, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <BarChart3 size={17} /> Kategori Özeti — Nereye Ne Harcadım?
          </h3>
          <div style={{ display: 'flex', gap: 6 }}>
            {PERIODS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setSummaryPeriod(p.value)}
                style={{
                  fontSize: 11, fontFamily: 'var(--font-body)', padding: '4px 10px', borderRadius: 999,
                  border: '1px solid var(--cl-border)', cursor: 'pointer',
                  background: summaryPeriod === p.value ? 'var(--cl-primary-800)' : 'transparent',
                  color: summaryPeriod === p.value ? 'white' : 'var(--cl-muted)',
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
                    border: isSpike ? '1px solid var(--cl-danger)' : '1px solid var(--cl-border)',
                    background: isSpike ? 'rgba(214, 69, 69, 0.06)' : 'var(--cl-surface)',
                  }}
                >
                  <div style={{ fontSize: 12, color: 'var(--cl-muted)', fontFamily: 'var(--font-body)', fontWeight: 600, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 5 }}>
                    {s.label} {isSpike && <AlertTriangle size={12} style={{ color: 'var(--cl-danger)' }} />}
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>{formatMoney(s.total)}</div>
                  <div style={{ fontSize: 11, color: 'var(--cl-muted)', marginTop: 2 }}>
                    {s.count} kalem
                    {changePercent != null && (
                      <span style={{ color: isSpike ? 'var(--cl-danger)' : 'inherit' }}> · {changePercent >= 0 ? '+' : ''}{changePercent}% önceki döneme göre</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="folder-panel" style={{ marginBottom: 20 }}>
        <h3 style={{ fontFamily: 'var(--cl-font-heading)', marginTop: 0, fontSize: 16 }}>Yeni Gider Ekle</h3>

        {pendingRecurring.length > 0 && (
          <div style={{ background: 'rgba(196, 154, 85, 0.1)', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <AlertTriangle size={13} /> Bu ay <strong>{pendingRecurring.length}</strong> sabit gider henüz ödenmedi: {pendingRecurring.map((p) => p.template.title).join(', ')}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
          <button type="button" className={expenseMode === 'single' ? 'btn btn-primary' : 'btn btn-secondary'} onClick={() => handleModeChange('single')}>
            Tek Seferlik Gider
          </button>
          <button type="button" className={expenseMode === 'recurring' ? 'btn btn-primary' : 'btn btn-secondary'} onClick={() => handleModeChange('recurring')} disabled={recurringTemplates.length === 0} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Repeat size={14} /> Sabit Gider (Şablondan)
          </button>
        </div>

        {expenseMode === 'recurring' && (
          <div className="form-field" style={{ marginBottom: 14, maxWidth: 300 }}>
            <label>Hangi Sabit Gider?</label>
            <select value={selectedTemplateId} onChange={(e) => handleSelectTemplate(e.target.value)}>
              {recurringTemplates.filter((t) => t.isActive).map((t) => (
                <option key={t.id} value={t.id}>{t.title} ({formatMoney(t.defaultAmount)})</option>
              ))}
            </select>
          </div>
        )}

        <form onSubmit={handleAdd} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          {expenseMode === 'single' && (
            <>
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
            </>
          )}
          <div className="form-field" style={{ margin: 0, minWidth: 160 }}>
            <label>Açıklama</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Örn: Ağustos Kirası" disabled={expenseMode === 'recurring'} />
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
          {expenseMode === 'single' && (
            <div className="form-field" style={{ margin: 0 }}>
              <label>Ödeme Yöntemi</label>
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                <option value="account">Kasa / Banka / Kredi Kartı</option>
                <option value="cheque">Çek Ver</option>
                <option value="note">Senet Ver</option>
              </select>
            </div>
          )}
          {expenseMode === 'recurring' || paymentMethod === 'account' ? (
            <div className="form-field" style={{ margin: 0, minWidth: 160 }}>
              <label>Ödeme Kaynağı (opsiyonel)</label>
              <select value={bankAccountId} onChange={(e) => setBankAccountId(e.target.value)}>
                <option value="">Seçilmedi</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>{acc.bankName ? `${acc.bankName} — ${acc.accountName}` : acc.accountName}</option>
                ))}
              </select>
            </div>
          ) : (
            <>
              <div className="form-field" style={{ margin: 0 }}>
                <label>Vade Tarihi</label>
                <input type="date" value={chequeDueDate} onChange={(e) => setChequeDueDate(e.target.value)} />
              </div>
              <div className="form-field" style={{ margin: 0, minWidth: 140 }}>
                <label>Kime Verildi</label>
                <input value={chequeDrawerName} onChange={(e) => setChequeDrawerName(e.target.value)} placeholder="Örn: ABC Tedarik" />
              </div>
            </>
          )}

          {expenseMode === 'single' && (
          <>
          {/* ARAMALI VE AÇILIR MENÜLÜ ÇOKLU DANIŞMAN YANSITMA ALANI */}
          <div className="form-field full" ref={menuRef} style={{ marginTop: 10, padding: 12, border: '1px solid var(--cl-border)', borderRadius: 10, background: 'var(--cl-bg)', position: 'relative' }}>
            <label style={{ fontSize: 13, fontWeight: 'bold', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Users size={14} /> Danışmanlara Masraf Yansıt (Opsiyonel)
            </label>

            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setIsAgentMenuOpen(!isAgentMenuOpen)}
                style={{ background: 'var(--cl-surface)', border: '1px solid var(--cl-border)', padding: '6px 12px', borderRadius: 6, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Search size={12} /> Danışman Seç / Ara</span>
                {selectedAgentIds.length > 0 && (
                  <span style={{ background: 'var(--cl-primary-800)', color: '#fff', padding: '1px 6px', borderRadius: 10, fontSize: 11, fontWeight: 'bold' }}>
                    {selectedAgentIds.length} Seçildi
                  </span>
                )}
                <ChevronDown size={12} />
              </button>

              {/* Seçilen Danışmanların Rozetleri */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {selectedAgentIds.map((id) => {
                  const ag = agents.find((a) => a.id === id);
                  return (
                    <span key={id} style={{ background: 'rgba(16, 35, 61, 0.08)', color: 'var(--cl-primary-800)', padding: '2px 8px', borderRadius: 4, fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                      {ag?.name}
                      <X size={11} onClick={() => handleAgentToggle(id)} style={{ cursor: 'pointer', marginLeft: 2, color: 'var(--cl-danger)' }} />
                    </span>
                  );
                })}
              </div>
            </div>

            {/* AÇILIR LİSTE (DROPDOWN MODAL) */}
            {isAgentMenuOpen && (
              <div style={{ position: 'absolute', top: '100%', left: 12, zIndex: 100, width: 320, background: 'var(--cl-surface)', border: '1px solid var(--cl-border)', borderRadius: 8, boxShadow: '0 10px 25px -5px rgba(16, 35, 61, 0.15)', padding: 10, marginTop: 4 }}>
                <input
                  type="text"
                  placeholder="Danışman adı ara..."
                  value={agentSearchQuery}
                  onChange={(e) => setAgentSearchQuery(e.target.value)}
                  style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid var(--cl-border)', fontSize: 12, marginBottom: 8 }}
                  autoFocus
                />

                <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {filteredAgents.length === 0 ? (
                    <div style={{ fontSize: 12, color: 'var(--cl-muted)', padding: 6, textAlign: 'center' }}>Danışman bulunamadı</div>
                  ) : (
                    filteredAgents.map((ag) => {
                      const isSelected = selectedAgentIds.includes(ag.id);
                      return (
                        <label key={ag.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 6, background: isSelected ? 'var(--cl-bg)' : 'transparent', cursor: 'pointer', fontSize: 13 }}>
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
              <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px dashed var(--cl-border)' }}>
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
          </>
          )}

          <button type="submit" className="btn btn-primary" disabled={saving || !title.trim() || !amount} style={{ marginTop: 10 }}>
            {saving ? 'Ekleniyor…' : '+ Gider Ekle'}
          </button>
        </form>
      </div>

      <div className="folder-panel" style={{ marginBottom: 20 }}>
        <button type="button" onClick={() => setShowTemplateManager((v) => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 13, color: 'var(--cl-muted)', fontFamily: 'var(--font-body)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <ChevronDown size={13} style={{ transform: showTemplateManager ? 'none' : 'rotate(-90deg)', transition: 'transform 0.15s ease' }} />
          <Settings size={13} /> Sabit Gider Şablonlarını Yönet ({recurringTemplates.length})
        </button>
        {showTemplateManager && (
          <div style={{ marginTop: 14 }}>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end', background: 'var(--cl-bg)', padding: 12, borderRadius: 10, marginBottom: 14 }}>
              <div className="form-field" style={{ margin: 0, minWidth: 140 }}>
                <label>Başlık</label>
                <input value={newTemplateTitle} onChange={(e) => setNewTemplateTitle(e.target.value)} placeholder="Örn: Ofis Kirası" />
              </div>
              <div className="form-field" style={{ margin: 0 }}>
                <label>Kategori</label>
                <select value={newTemplateCategory} onChange={(e) => setNewTemplateCategory(e.target.value)}>
                  <option value="">Seçiniz</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-field" style={{ margin: 0 }}>
                <label>Varsayılan Tutar</label>
                <input type="number" min="0.01" step="0.01" value={newTemplateAmount} onChange={(e) => setNewTemplateAmount(e.target.value)} />
              </div>
              <div className="form-field" style={{ margin: 0, maxWidth: 130 }}>
                <label>Ayın Kaçıncı Günü</label>
                <input type="number" min="1" max="31" value={newTemplateDueDay} onChange={(e) => setNewTemplateDueDay(e.target.value)} />
              </div>
              <div className="form-field" style={{ margin: 0, minWidth: 160 }}>
                <label>Varsayılan Hesap (opsiyonel)</label>
                <select value={newTemplateBankAccountId} onChange={(e) => setNewTemplateBankAccountId(e.target.value)}>
                  <option value="">Seçilmedi</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>{acc.bankName ? `${acc.bankName} — ${acc.accountName}` : acc.accountName}</option>
                  ))}
                </select>
              </div>
              <button type="button" className="btn btn-primary" disabled={savingTemplate || !newTemplateTitle.trim() || !newTemplateAmount || !newTemplateCategory} onClick={handleCreateTemplate}>
                {savingTemplate ? 'Ekleniyor…' : '+ Şablon Ekle'}
              </button>
            </div>
            {recurringTemplates.length === 0 ? (
              <div className="empty-state">Henüz şablon eklenmemiş.</div>
            ) : (
              recurringTemplates.map((t) => (
                <div key={t.id} className="ledger-history-item" style={{ opacity: t.isActive ? 1 : 0.5 }}>
                  <span style={{ flex: 1 }}>{t.title}</span>
                  <span style={{ fontSize: 12, color: 'var(--cl-muted)' }}>{categories.find((c) => c.id === t.categoryId)?.name || '—'} · Her ayın {t.dueDayOfMonth}. günü</span>
                  <span style={{ fontFamily: 'var(--font-body)' }}>{formatMoney(t.defaultAmount)}</span>
                  <button type="button" className="btn btn-secondary" style={{ fontSize: 11, padding: '4px 8px' }} onClick={() => handleToggleTemplateActive(t)}>
                    {t.isActive ? 'Pasifleştir' : 'Aktifleştir'}
                  </button>
                  <button type="button" className="task-row__delete" onClick={() => handleDeleteTemplate(t.id)} title="Sil"><X size={13} /></button>
                </div>
              ))
            )}
          </div>
        )}
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
                <tr style={{ textAlign: 'left', color: 'var(--cl-muted)', fontFamily: 'var(--font-body)', fontSize: 11, textTransform: 'uppercase' }}>
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
                    <tr key={exp.id} style={{ borderTop: '1px solid var(--cl-border)' }}>
                      <td style={{ padding: '8px' }}>{new Date(exp.date).toLocaleDateString('tr-TR')}</td>
                      <td style={{ padding: '8px', display: 'flex', alignItems: 'center', gap: 4 }}>{catLabel}{exp.isRecurring && <Repeat size={11} style={{ color: 'var(--cl-muted)' }} />}</td>
                      <td style={{ padding: '8px' }}>
                        {exp.title}
                        {exp.referenceNo && <span style={{ color: 'var(--cl-muted)', fontFamily: 'var(--font-body)', fontSize: 11 }}> · {exp.referenceNo}</span>}
                      </td>
                      <td style={{ padding: '8px', fontFamily: 'var(--font-body)', color: 'var(--cl-danger)' }}>
                        {formatMoney(exp.amount)}
                        {exp.vatRate != null && <span style={{ color: 'var(--cl-muted)', fontSize: 11 }}> (KDV %{exp.vatRate})</span>}
                      </td>
                      <td style={{ padding: '8px' }}>
                        {exp.chargebacks && exp.chargebacks.length > 0 ? (
                          exp.chargebacks.map((cb, idx) => {
                            const ag = agents.find((a) => a.id === cb.agentId);
                            return (
                              <span key={idx} style={{ display: 'inline-block', background: 'rgba(16, 35, 61, 0.08)', color: 'var(--cl-primary-800)', padding: '1px 5px', borderRadius: 4, fontSize: 11, marginRight: 4 }}>
                                {ag ? ag.name : 'Danışman'}: {formatMoney(cb.amount)}
                              </span>
                            );
                          })
                        ) : exp.agentId ? (
                          <span>
                            {agents.find((a) => a.id === exp.agentId)?.name || 'Danışman'}
                            {exp.chargebackPercentage > 0 && <span style={{ color: 'var(--cl-muted)', fontSize: 11 }}> (%{exp.chargebackPercentage})</span>}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td style={{ padding: '8px' }}>
                        <button type="button" className="task-row__delete" onClick={() => handleDelete(exp.id)} title="Sil"><X size={13} /></button>
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
