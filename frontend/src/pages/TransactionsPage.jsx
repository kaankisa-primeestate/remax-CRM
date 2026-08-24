import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { transactionsApi, TRANSACTION_STAGES } from '../api/transactions';
import { customersApi } from '../api/customers';
import { propertiesApi } from '../api/properties';
import { useAuth } from '../context/AuthContext.jsx';

const money = (n) =>
  n ? new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(n) : null;

function getStaleness(t) {
  if (t.stage === 'closed' && t.dealApproved) return { level: 'none', days: 0 };
  const since = t.stageChangedAt || t.createdAt;
  if (!since) return { level: 'none', days: 0 };
  const days = Math.floor((Date.now() - new Date(since).getTime()) / 86400000);
  if (days >= 15) return { level: 'danger', days };
  if (days >= 7) return { level: 'warning', days };
  return { level: 'none', days };
}

// Panonun tek gorevi artik "hangi dosyayi acacagim" secim ekrani olmak --
// asil is (Gosterim/Teklif/Tapu/Kapanis formlari, Aktivite Akisi, Belgeler)
// ayri bir sayfada (/islemler/:id, TransactionDetailPage.jsx). Bu, Musteri
// ve Portfoy sayfalariyla AYNI, tutarli deseni izliyor -- HubSpot/Salesforce
// tarzi "kayit sayfasi" (record page) mimarisi.
export default function TransactionsPage() {
  const { isBroker } = useAuth();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);

  const [customerMode, setCustomerMode] = useState('system');
  const [customerId, setCustomerId] = useState('');
  const [externalCustomerLabel, setExternalCustomerLabel] = useState('');
  const [propertyMode, setPropertyMode] = useState('system');
  const [propertyId, setPropertyId] = useState('');
  const [externalPropertyLabel, setExternalPropertyLabel] = useState('');
  const [offerAmount, setOfferAmount] = useState('');
  const [saving, setSaving] = useState(false);

  const [draggedId, setDraggedId] = useState(null);
  const [dragOverStage, setDragOverStage] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [txs, custs, props] = await Promise.all([
        transactionsApi.list().catch(() => []),
        customersApi.list({}).catch(() => []),
        propertiesApi.list({}).catch(() => []),
      ]);
      setTransactions(txs);
      setCustomers(custs);
      setProperties(props);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function resetForm() {
    setCustomerMode('system');
    setCustomerId('');
    setExternalCustomerLabel('');
    setPropertyMode('system');
    setPropertyId('');
    setExternalPropertyLabel('');
    setOfferAmount('');
  }

  async function handleAdd(e) {
    e.preventDefault();
    const hasCustomer = customerMode === 'system' ? !!customerId : !!externalCustomerLabel.trim();
    if (!hasCustomer) {
      alert(customerMode === 'system' ? 'Lütfen bir müşteri seçin.' : 'Lütfen harici müşteri bilgisi girin.');
      return;
    }
    const hasProperty = propertyMode === 'system' ? !!propertyId : !!externalPropertyLabel.trim();
    setSaving(true);
    try {
      await transactionsApi.create({
        customerId: customerMode === 'system' ? customerId : undefined,
        externalCustomerLabel: customerMode === 'external' ? externalCustomerLabel.trim() : undefined,
        propertyId: hasProperty && propertyMode === 'system' ? propertyId : undefined,
        externalPropertyLabel: hasProperty && propertyMode === 'external' ? externalPropertyLabel.trim() : undefined,
        offerAmount: offerAmount ? Number(offerAmount) : undefined,
      });
      resetForm();
      load();
    } catch (err) {
      const message = err?.response?.data?.message ?? 'İşlem oluşturulamadı, tekrar deneyin.';
      alert(Array.isArray(message) ? message.join(', ') : message);
    } finally {
      setSaving(false);
    }
  }

  async function handleStageChange(txId, newStage) {
    setTransactions((prev) => prev.map((t) => (t.id === txId ? { ...t, stage: newStage } : t)));
    try {
      await transactionsApi.update(txId, { stage: newStage });
    } catch {
      alert('Aşama güncellenemedi, sayfa yenileniyor.');
      load();
    }
  }

  function handleDragStart(txId) { setDraggedId(txId); }
  function handleDragEnd() { setDraggedId(null); setDragOverStage(null); }
  function handleColumnDragOver(e, stageValue) { e.preventDefault(); if (dragOverStage !== stageValue) setDragOverStage(stageValue); }
  function handleColumnDragLeave(stageValue) { setDragOverStage((prev) => (prev === stageValue ? null : prev)); }
  function handleColumnDrop(e, stageValue) {
    e.preventDefault();
    setDragOverStage(null);
    if (!draggedId) return;
    const dragged = transactions.find((t) => t.id === draggedId);
    setDraggedId(null);
    if (!dragged || dragged.stage === stageValue) return;
    handleStageChange(draggedId, stageValue);
  }

  async function handleDelete(txId) {
    if (!confirm('Bu işlem silinsin mi?')) return;
    setTransactions((prev) => prev.filter((t) => t.id !== txId));
    try { await transactionsApi.remove(txId); } catch { load(); }
  }

  async function handleApproveDeal(t) {
    try {
      await transactionsApi.update(t.id, { dealApproved: true });
      const customer = customers.find((c) => c.id === t.customerId);
      const property = properties.find((p) => p.id === t.propertyId);
      navigate('/komisyonlar', {
        state: {
          prefillCommission: {
            agentId: t.agentId,
            propertyId: t.propertyId,
            customerId: t.customerId,
            propertyTitle: property?.title || t.externalPropertyLabel || '',
            transactionType: property?.listingType === 'rent' ? 'rent' : 'sale',
            transactionAmount: t.offerAmount || '',
            dueDate: new Date().toISOString().slice(0, 10),
          },
        },
      });
    } catch (err) {
      const message = err?.response?.data?.message ?? 'Onaylanamadı.';
      alert(Array.isArray(message) ? message.join(', ') : message);
    }
  }

  return (
    <div>
      <h2 className="dossier__name" style={{ marginBottom: 16 }}>İşlemler (Uçtan Uca Takip)</h2>

      <div className="folder-panel" style={{ marginBottom: 20 }}>
        <h3 style={{ fontFamily: 'var(--font-display)', marginTop: 0, fontSize: 16 }}>Yeni İşlem Başlat</h3>
        <form onSubmit={handleAdd} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-field" style={{ margin: 0, minWidth: 200 }}>
            <label>Müşteri</label>
            <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
              <button type="button" className={customerMode === 'system' ? 'btn btn-primary' : 'btn btn-secondary'} style={{ fontSize: 11, padding: '3px 8px' }} onClick={() => setCustomerMode('system')}>Sistemde Kayıtlı</button>
              <button type="button" className={customerMode === 'external' ? 'btn btn-primary' : 'btn btn-secondary'} style={{ fontSize: 11, padding: '3px 8px' }} onClick={() => setCustomerMode('external')}>Harici</button>
            </div>
            {customerMode === 'system' ? (
              <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                <option value="">Seçiniz</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
                ))}
              </select>
            ) : (
              <input value={externalCustomerLabel} onChange={(e) => setExternalCustomerLabel(e.target.value)} placeholder="Örn: Zeynep Hanım (0555...)" />
            )}
          </div>
          <div className="form-field" style={{ margin: 0, minWidth: 200 }}>
            <label>Portföy (opsiyonel)</label>
            <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
              <button type="button" className={propertyMode === 'system' ? 'btn btn-primary' : 'btn btn-secondary'} style={{ fontSize: 11, padding: '3px 8px' }} onClick={() => setPropertyMode('system')}>Sistemde Kayıtlı</button>
              <button type="button" className={propertyMode === 'external' ? 'btn btn-primary' : 'btn btn-secondary'} style={{ fontSize: 11, padding: '3px 8px' }} onClick={() => setPropertyMode('external')}>Harici</button>
            </div>
            {propertyMode === 'system' ? (
              <select value={propertyId} onChange={(e) => setPropertyId(e.target.value)}>
                <option value="">Seçiniz</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            ) : (
              <input value={externalPropertyLabel} onChange={(e) => setExternalPropertyLabel(e.target.value)} placeholder="Örn: Kadıköy 3+1 Daire" />
            )}
          </div>
          <div className="form-field" style={{ margin: 0 }}>
            <label>Teklif Tutarı (opsiyonel)</label>
            <input type="number" min="0" value={offerAmount} onChange={(e) => setOfferAmount(e.target.value)} placeholder="₺" />
          </div>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Ekleniyor…' : '+ İşlem Başlat'}
          </button>
        </form>
      </div>

      <div className="folder-panel">
        {loading ? (
          <div className="empty-state">Yükleniyor…</div>
        ) : (
          <div className="kanban-board">
            {TRANSACTION_STAGES.map((stage) => {
              const stageTransactions = transactions.filter((t) => t.stage === stage.value);
              const stageTotal = stageTransactions.reduce((sum, t) => sum + (Number(t.offerAmount) || 0), 0);
              return (
                <div
                  className={`kanban-column${dragOverStage === stage.value ? ' kanban-column--drag-over' : ''}`}
                  key={stage.value}
                  onDragOver={(e) => handleColumnDragOver(e, stage.value)}
                  onDragLeave={() => handleColumnDragLeave(stage.value)}
                  onDrop={(e) => handleColumnDrop(e, stage.value)}
                >
                  <div className="kanban-column__title">
                    {stage.label} ({stageTransactions.length})
                    {stageTotal > 0 && <div className="kanban-column__total">{money(stageTotal)}</div>}
                  </div>
                  {stageTransactions.length === 0 ? (
                    <div className="kanban-empty">Bu aşamada işlem yok</div>
                  ) : (
                    stageTransactions.map((t) => {
                      const customer = customers.find((c) => c.id === t.customerId);
                      const property = properties.find((p) => p.id === t.propertyId);
                      const staleness = getStaleness(t);
                      const cardClass = staleness.level === 'danger'
                        ? 'transaction-card transaction-card--stale-danger'
                        : staleness.level === 'warning'
                          ? 'transaction-card transaction-card--stale-warning'
                          : 'transaction-card';
                      return (
                        <div
                          key={t.id}
                          className={`${cardClass}${draggedId === t.id ? ' transaction-card--dragging' : ''}`}
                          draggable
                          onDragStart={() => handleDragStart(t.id)}
                          onDragEnd={handleDragEnd}
                        >
                          {staleness.level !== 'none' && (
                            <div className={staleness.level === 'danger' ? 'staleness-badge staleness-badge--danger' : 'staleness-badge staleness-badge--warning'}>
                              ⏱ {staleness.days} gündür bekliyor
                            </div>
                          )}
                          {t.collaboratorAgentId && (
                            <div className="staleness-badge" style={{ background: t.splitFinalizedAt ? '#e6f4ea' : '#eef3f9', color: t.splitFinalizedAt ? '#1e7a3d' : 'var(--ink-navy)', marginBottom: 6 }}>
                              🤝 İşbirlikli{t.splitFinalizedAt ? '' : ' · onay bekliyor'}
                            </div>
                          )}
                          <Link to={`/islemler/${t.id}`} className="transaction-card__title" style={{ display: 'block', cursor: 'pointer' }}>
                            {property ? property.title : (t.externalPropertyLabel || '📋 Portföy Belirlenmedi')}
                          </Link>
                          <div className="transaction-card__meta">
                            {customer ? (
                              <Link to={`/musteriler/${customer.id}`}>{customer.firstName} {customer.lastName}</Link>
                            ) : (t.externalCustomerLabel || 'Müşteri Silinmiş')}
                          </div>
                          {t.offerAmount && (
                            <div className="transaction-card__offer">{money(t.offerAmount)}</div>
                          )}
                          {t.stage === 'closed' && (
                            <div className={t.dealApproved ? 'deal-approval-badge deal-approval-badge--ok' : 'deal-approval-badge'}>
                              {t.dealApproved ? '✓ Broker onayladı' : '⏳ Broker onayı bekliyor'}
                            </div>
                          )}
                          {t.stage === 'closed' && !t.dealApproved && isBroker && (
                            <button type="button" className="btn btn-primary" style={{ fontSize: 11, padding: '4px 10px', marginTop: 6, width: '100%' }} onClick={() => handleApproveDeal(t)}>
                              ✓ Onayla ve Komisyon Aç
                            </button>
                          )}
                          <div className="transaction-card__actions">
                            <select value={t.stage} onChange={(e) => handleStageChange(t.id, e.target.value)} className="transaction-card__stage-select">
                              {TRANSACTION_STAGES.map((s) => (
                                <option key={s.value} value={s.value}>{s.label}</option>
                              ))}
                            </select>
                            <Link to={`/islemler/${t.id}`} className="btn btn-secondary" style={{ fontSize: 11, padding: '4px 8px' }}>Dosyayı Aç</Link>
                            <button type="button" className="task-row__delete" onClick={() => handleDelete(t.id)} title="Sil">✕</button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
