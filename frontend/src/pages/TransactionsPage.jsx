import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { transactionsApi, TRANSACTION_STAGES, TRANSACTION_DOC_TYPES } from '../api/transactions';
import { customersApi, CUSTOMER_TYPES } from '../api/customers';
import { propertiesApi } from '../api/properties';
import { uploadFile } from '../api/client';
import { usersApi } from '../api/auth';
import { useAuth } from '../context/AuthContext.jsx';

const money = (n) =>
  n ? new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(n) : null;

// Hareketsizlik uyarısı: bir işlem son aşama değişiminden bu yana kaç
// gündür bekliyor -- 7-14 gün "warning" (sarı), 15+ gün "danger" (kırmızı).
// Kapanış + Broker onaylanmış işlemler tamamlanmış sayılır, uyarı gösterilmez.
function getStaleness(t) {
  if (t.stage === 'closed' && t.dealApproved) return { level: 'none', days: 0 };
  const since = t.stageChangedAt || t.createdAt;
  if (!since) return { level: 'none', days: 0 };
  const days = Math.floor((Date.now() - new Date(since).getTime()) / 86400000);
  if (days >= 15) return { level: 'danger', days };
  if (days >= 7) return { level: 'warning', days };
  return { level: 'none', days };
}

const DETAIL_TABS = [
  { key: 'summary', label: '📋 Özet' },
  { key: 'financial', label: '💰 Finansal' },
  { key: 'docs', label: '📁 Belgeler' },
  { key: 'timeline', label: '🕐 Zaman Akışı' },
  { key: 'collab', label: '🤝 İşbirliği' },
];

// Islemler: Talep -> Gosterme -> Teklif -> Tapu -> Kapanis Kanban panosu.
// Musteri/Portfoy artik OPSIYONEL -- sistemde kayitli olabilir YA DA
// "harici" (ofis disi) bir taraf icin serbest metin girilebilir. Bir
// karta tiklaninca 4 sekmeli detay paneli acilir.
export default function TransactionsPage() {
  const { isBroker, user } = useAuth();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [agentRoster, setAgentRoster] = useState([]);
  const [splitSaving, setSplitSaving] = useState(false);
  const [splitDraft, setSplitDraft] = useState('');

  const [customerMode, setCustomerMode] = useState('system'); // 'system' | 'external'
  const [customerId, setCustomerId] = useState('');
  const [externalCustomerLabel, setExternalCustomerLabel] = useState('');
  const [propertyMode, setPropertyMode] = useState('system');
  const [propertyId, setPropertyId] = useState('');
  const [externalPropertyLabel, setExternalPropertyLabel] = useState('');
  const [offerAmount, setOfferAmount] = useState('');
  const [saving, setSaving] = useState(false);

  const [draggedId, setDraggedId] = useState(null);
  const [dragOverStage, setDragOverStage] = useState(null);
  const [detailTx, setDetailTx] = useState(null);
  const [activeDetailTab, setActiveDetailTab] = useState('summary');
  const [notes, setNotes] = useState([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositDate, setDepositDate] = useState('');
  const [savingDeposit, setSavingDeposit] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [uploadingType, setUploadingType] = useState(null); // hangi kalem icin yukleme devam ediyor
  const [otherLabel, setOtherLabel] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const [txs, custs, props] = await Promise.all([
      transactionsApi.list(),
      customersApi.list({}),
      propertiesApi.list({}),
    ]);
    setTransactions(txs);
    setCustomers(custs);
    setProperties(props);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    usersApi.listAgentRoster().then(setAgentRoster).catch(() => setAgentRoster([]));
  }, []);

  function agentNameFor(agentId) {
    return agentRoster.find((a) => a.id === agentId)?.name || 'Bilinmeyen';
  }

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
    // Portfoy BILEREK opsiyonel -- bir Talep, henuz portfoy belirlenmeden
    // (sadece "ne ariyor" bilgisiyle) acilabilir.
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
    } catch (err) {
      alert('Aşama güncellenemedi, sayfa yenileniyor.');
      load();
    }
  }

  // Surukle-birak ile asama degistirme -- dropdown'a EK bir secenek olarak
  // eklendi, dropdown kaldirilmadi (dokunmatik ekranlarda surukleme rahat
  // calismayabiliyor, dropdown guvenli bir yedek olarak kalsin).
  function handleDragStart(txId) {
    setDraggedId(txId);
  }

  function handleDragEnd() {
    setDraggedId(null);
    setDragOverStage(null);
  }

  function handleColumnDragOver(e, stageValue) {
    e.preventDefault();
    if (dragOverStage !== stageValue) setDragOverStage(stageValue);
  }

  function handleColumnDragLeave(stageValue) {
    setDragOverStage((prev) => (prev === stageValue ? null : prev));
  }

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
    try {
      await transactionsApi.remove(txId);
    } catch {
      alert('İşlem silinemedi, sayfa yenileniyor.');
      load();
    }
  }

  // Tapu Onay Akisi: Broker onaylayinca (SADECE Kapanis asamasindaki
  // islemler icin), bu bilgilerle ON-DOLDURULMUS bir Komisyon formu
  // acilsin diye Komisyonlar sayfasina yonlendiriyoruz.
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

  async function openDetail(t) {
    setDetailTx(t);
    setActiveDetailTab('summary');
    setDepositAmount(t.depositAmount != null ? String(t.depositAmount) : '');
    setDepositDate(t.depositDate ? t.depositDate.slice(0, 10) : '');
    setSplitDraft(t.commissionSplitPercentage != null ? String(t.commissionSplitPercentage) : '50');
    setNotes([]);
    setDocuments([]);
    setNotesLoading(true);
    setDocumentsLoading(true);
    try {
      const list = await transactionsApi.getNotes(t.id);
      setNotes(list);
    } catch {
      setNotes([]);
    } finally {
      setNotesLoading(false);
    }
    try {
      const docs = await transactionsApi.getDocuments(t.id);
      setDocuments(docs);
    } catch {
      setDocuments([]);
    } finally {
      setDocumentsLoading(false);
    }
  }

  function closeDetail() {
    setDetailTx(null);
    setNewNote('');
  }

  async function handleAddNote() {
    if (!newNote.trim() || !detailTx) return;
    setSavingNote(true);
    try {
      const saved = await transactionsApi.addNote(detailTx.id, newNote.trim());
      setNotes((prev) => [saved, ...prev]);
      setNewNote('');
    } catch {
      alert('Not eklenemedi, tekrar deneyin.');
    } finally {
      setSavingNote(false);
    }
  }

  // Belgeler: bir kontrol listesi kaleminin en son eklenen satiri, o kalemin
  // guncel durumunu gosterir (yeni satir eskisinin "uzerine" yazar, gecmis
  // silinmez).
  function latestDocFor(docType) {
    return documents.find((d) => d.docType === docType) || null; // documents zaten createdAt DESC sirali geliyor
  }

  async function handleUploadDocument(docType, file, label) {
    if (!detailTx || !file) return;
    setUploadingType(docType);
    try {
      const url = await uploadFile(file);
      const saved = await transactionsApi.addDocument(detailTx.id, {
        docType,
        label: label || undefined,
        fileUrl: url,
        fileName: file.name,
      });
      setDocuments((prev) => [saved, ...prev]);
      if (docType === 'other') setOtherLabel('');
    } catch {
      alert('Dosya yüklenemedi, tekrar deneyin.');
    } finally {
      setUploadingType(null);
    }
  }

  async function handleMarkDocumentDone(docType) {
    if (!detailTx) return;
    setUploadingType(docType);
    try {
      const saved = await transactionsApi.addDocument(detailTx.id, { docType, completed: true });
      setDocuments((prev) => [saved, ...prev]);
    } catch {
      alert('İşaretlenemedi, tekrar deneyin.');
    } finally {
      setUploadingType(null);
    }
  }

  async function handleDeleteDocument(documentId) {
    if (!confirm('Bu belge silinsin mi?')) return;
    setDocuments((prev) => prev.filter((d) => d.id !== documentId));
    try {
      await transactionsApi.removeDocument(documentId);
    } catch {
      alert('Belge silinemedi, sayfa yenileniyor.');
      if (detailTx) openDetail(detailTx);
    }
  }

  // --- Isbirlikli Satis: paylasim orani degistirme + onaylama ---

  async function handleUpdateSplit() {
    if (!detailTx) return;
    const pct = Number(splitDraft);
    if (Number.isNaN(pct) || pct < 0 || pct > 100) {
      alert('Lütfen 0-100 arasında geçerli bir oran girin.');
      return;
    }
    setSplitSaving(true);
    try {
      const updated = await transactionsApi.updateSplit(detailTx.id, pct);
      setDetailTx(updated);
      setTransactions((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } catch {
      alert('Paylaşım oranı güncellenemedi, tekrar deneyin.');
    } finally {
      setSplitSaving(false);
    }
  }

  async function handleApproveSplit() {
    if (!detailTx) return;
    setSplitSaving(true);
    try {
      const updated = await transactionsApi.approveSplit(detailTx.id);
      setDetailTx(updated);
      setTransactions((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } catch {
      alert('Onaylanamadı, tekrar deneyin.');
    } finally {
      setSplitSaving(false);
    }
  }

  async function handleSaveDeposit() {
    if (!detailTx) return;
    setSavingDeposit(true);
    try {
      const updated = await transactionsApi.update(detailTx.id, {
        depositAmount: depositAmount ? Number(depositAmount) : undefined,
        depositDate: depositDate || undefined,
      });
      setDetailTx(updated);
      setTransactions((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } catch {
      alert('Kaparo bilgisi kaydedilemedi, tekrar deneyin.');
    } finally {
      setSavingDeposit(false);
    }
  }

  const detailCustomer = detailTx ? customers.find((c) => c.id === detailTx.customerId) : null;
  const detailProperty = detailTx ? properties.find((p) => p.id === detailTx.propertyId) : null;

  return (
    <div>
      <h2 className="dossier__name" style={{ marginBottom: 16 }}>İşlemler</h2>

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
              <input value={externalCustomerLabel} onChange={(e) => setExternalCustomerLabel(e.target.value)} placeholder="Örn: Zeynep Hanım (0555...) - başka ofis" />
            )}
          </div>
          <div className="form-field" style={{ margin: 0, minWidth: 200 }}>
            <label>Portföy (opsiyonel — henüz belirlenmemişse boş bırakabilirsin)</label>
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
              <input value={externalPropertyLabel} onChange={(e) => setExternalPropertyLabel(e.target.value)} placeholder="Örn: Sahibinden ilanı - Kadıköy 3+1" />
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
                            <div
                              className={staleness.level === 'danger' ? 'staleness-badge staleness-badge--danger' : 'staleness-badge staleness-badge--warning'}
                              title="Bu işlem uzun süredir bu aşamada bekliyor"
                            >
                              ⏱ {staleness.days} gündür bu aşamada
                            </div>
                          )}
                          {t.collaboratorAgentId && (
                            <div
                              className="staleness-badge"
                              style={{
                                background: t.splitFinalizedAt ? '#e6f4ea' : '#eef3f9',
                                color: t.splitFinalizedAt ? '#1e7a3d' : 'var(--ink-navy)',
                                marginBottom: 6,
                              }}
                              title={t.splitFinalizedAt ? 'Komisyon paylaşımı kesinleşti' : 'Komisyon paylaşımı onay bekliyor'}
                            >
                              🤝 İşbirlikli{t.splitFinalizedAt ? '' : ' · onay bekliyor'}
                            </div>
                          )}
                          <div className="transaction-card__title" onClick={() => openDetail(t)} style={{ cursor: 'pointer' }}>
                            {property ? property.title : (t.externalPropertyLabel || (t.propertyId ? 'Portföy silinmiş' : '📋 Portföy henüz belirlenmedi'))}
                            {!property && t.externalPropertyLabel && <span className="external-tag"> harici</span>}
                          </div>
                          <div className="transaction-card__meta">
                            {customer ? (
                              <Link to={`/musteriler/${customer.id}`}>{customer.firstName} {customer.lastName}</Link>
                            ) : (t.externalCustomerLabel || 'Müşteri silinmiş')}
                            {!customer && t.externalCustomerLabel && <span className="external-tag"> harici</span>}
                            {customer && ` · ${CUSTOMER_TYPES.find((ct) => ct.value === customer.type)?.label}`}
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
                            <button
                              type="button"
                              className="btn btn-primary"
                              style={{ fontSize: 11, padding: '4px 10px', marginTop: 6, width: '100%' }}
                              onClick={() => handleApproveDeal(t)}
                            >
                              ✓ Onayla ve Komisyon Aç
                            </button>
                          )}
                          <div className="transaction-card__actions">
                            <select
                              value={t.stage}
                              onChange={(e) => handleStageChange(t.id, e.target.value)}
                              className="transaction-card__stage-select"
                            >
                              {TRANSACTION_STAGES.map((s) => (
                                <option key={s.value} value={s.value}>{s.label}</option>
                              ))}
                            </select>
                            <button type="button" className="btn btn-secondary" style={{ fontSize: 11, padding: '4px 8px' }} onClick={() => openDetail(t)}>Detay</button>
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

      {detailTx && (
        <div className="modal-backdrop" onClick={closeDetail}>
          <div className="modal" style={{ maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h2 style={{ margin: 0 }}>{detailProperty?.title || detailTx.externalPropertyLabel || 'İşlem Detayı'}</h2>
              <button type="button" className="office-modal__close" onClick={closeDetail}>✕</button>
            </div>

            <div className="folder-tabs" style={{ flexWrap: 'wrap' }}>
              {DETAIL_TABS.map((tab) => {
                let label = tab.label;
                if (tab.key === 'docs' && documents.length > 0) {
                  const doneCount = TRANSACTION_DOC_TYPES.filter((dt) => latestDocFor(dt.value)?.completed).length;
                  label = `${tab.label} (${doneCount}/${TRANSACTION_DOC_TYPES.length})`;
                }
                return (
                  <button
                    key={tab.key}
                    type="button"
                    className={`folder-tab${activeDetailTab === tab.key ? ' active' : ''}`}
                    onClick={() => setActiveDetailTab(tab.key)}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            <div className="finance-tab-content" style={{ maxHeight: '55vh', overflowY: 'auto', paddingTop: 16 }}>
              {activeDetailTab === 'summary' && (
                <div>
                  <h4 style={{ fontFamily: 'var(--font-display)', marginTop: 0 }}>Müşteri / Alıcı</h4>
                  {detailCustomer ? (
                    <p style={{ fontSize: 14 }}>
                      <Link to={`/musteriler/${detailCustomer.id}`}>{detailCustomer.firstName} {detailCustomer.lastName}</Link>
                      {detailCustomer.phone && ` · ${detailCustomer.phone}`}
                    </p>
                  ) : (
                    <p style={{ fontSize: 14, color: 'var(--muted)' }}>{detailTx.externalCustomerLabel || '—'} (harici)</p>
                  )}

                  <h4 style={{ fontFamily: 'var(--font-display)' }}>Portföy</h4>
                  {detailProperty ? (
                    <p style={{ fontSize: 14 }}>
                      <Link to={`/portfoyler/${detailProperty.id}`}>{detailProperty.title}</Link>
                      {' · '}{detailProperty.district}
                    </p>
                  ) : (
                    <p style={{ fontSize: 14, color: 'var(--muted)' }}>
                      {detailTx.externalPropertyLabel ? `${detailTx.externalPropertyLabel} (harici)` : 'Henüz belirlenmedi — süreç ilerledikçe eklenebilir.'}
                    </p>
                  )}

                  {detailProperty && (detailProperty.ownerName || detailProperty.ownerPhone) && (
                    <>
                      <h4 style={{ fontFamily: 'var(--font-display)' }}>Satıcı / Mülk Sahibi</h4>
                      <p style={{ fontSize: 14 }}>
                        {detailProperty.ownerName || '—'}
                        {detailProperty.ownerPhone && ` · ${detailProperty.ownerPhone}`}
                      </p>
                    </>
                  )}
                </div>
              )}

              {activeDetailTab === 'financial' && (
                <div>
                  <h4 style={{ fontFamily: 'var(--font-display)', marginTop: 0 }}>Teklif Tutarı</h4>
                  <p style={{ fontSize: 18, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{money(detailTx.offerAmount) || '—'}</p>

                  <h4 style={{ fontFamily: 'var(--font-display)' }}>Kaparo / Depozito</h4>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <div className="form-field" style={{ margin: 0 }}>
                      <label>Tutar</label>
                      <input type="number" min="0" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} style={{ width: 130 }} />
                    </div>
                    <div className="form-field" style={{ margin: 0 }}>
                      <label>Tarih</label>
                      <input type="date" value={depositDate} onChange={(e) => setDepositDate(e.target.value)} />
                    </div>
                    <button type="button" className="btn btn-primary" style={{ fontSize: 12, padding: '6px 12px' }} disabled={savingDeposit} onClick={handleSaveDeposit}>
                      {savingDeposit ? 'Kaydediliyor…' : 'Kaydet'}
                    </button>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 14 }}>
                    Komisyon oranı ve payı, işlem Kapanış aşamasına geldiğinde Komisyonlar sayfasında belirlenir.
                  </p>
                </div>
              )}

              {activeDetailTab === 'docs' && (
                <div>
                  {documentsLoading ? (
                    <div className="empty-state">Yükleniyor…</div>
                  ) : (
                    <>
                      <div className="doc-checklist">
                        {TRANSACTION_DOC_TYPES.map((docType) => {
                          const latest = latestDocFor(docType.value);
                          const isDone = !!latest?.completed;
                          const isUploading = uploadingType === docType.value;
                          return (
                            <div key={docType.value} className={`doc-checklist__item${isDone ? ' doc-checklist__item--done' : ''}`}>
                              <div className="doc-checklist__header">
                                <span className="doc-checklist__check">{isDone ? '✅' : '⬜'}</span>
                                <span className="doc-checklist__title">{docType.label}</span>
                              </div>
                              {latest?.fileUrl ? (
                                <a href={latest.fileUrl} target="_blank" rel="noreferrer" className="doc-checklist__file">
                                  📎 {latest.fileName || 'Dosyayı görüntüle'}
                                </a>
                              ) : (
                                <div className="doc-checklist__actions">
                                  <label className="btn btn-secondary doc-checklist__upload-btn">
                                    {isUploading ? 'Yükleniyor…' : '📎 Dosya Yükle'}
                                    <input
                                      type="file"
                                      style={{ display: 'none' }}
                                      disabled={isUploading}
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) handleUploadDocument(docType.value, file);
                                        e.target.value = '';
                                      }}
                                    />
                                  </label>
                                  {!isDone && (
                                    <button
                                      type="button"
                                      className="btn btn-secondary"
                                      style={{ fontSize: 11, padding: '4px 8px' }}
                                      disabled={isUploading}
                                      onClick={() => handleMarkDocumentDone(docType.value)}
                                    >
                                      Dosyasız Tamamlandı İşaretle
                                    </button>
                                  )}
                                </div>
                              )}
                              {latest && (
                                <button
                                  type="button"
                                  className="doc-checklist__remove"
                                  onClick={() => handleDeleteDocument(latest.id)}
                                >
                                  Kaldır
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      <h4 style={{ fontFamily: 'var(--font-display)', marginTop: 18 }}>Diğer Belgeler</h4>
                      <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                        <div className="form-field" style={{ margin: 0, flex: 1, minWidth: 160 }}>
                          <label>Belge Adı</label>
                          <input value={otherLabel} onChange={(e) => setOtherLabel(e.target.value)} placeholder="Örn: Vekaletname, Ekspertiz Raporu" />
                        </div>
                        <label className={`btn btn-primary doc-checklist__upload-btn${!otherLabel.trim() ? ' is-disabled' : ''}`}>
                          {uploadingType === 'other' ? 'Yükleniyor…' : '+ Dosya Ekle'}
                          <input
                            type="file"
                            style={{ display: 'none' }}
                            disabled={!otherLabel.trim() || uploadingType === 'other'}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file && otherLabel.trim()) handleUploadDocument('other', file, otherLabel.trim());
                              e.target.value = '';
                            }}
                          />
                        </label>
                      </div>
                      {documents.filter((d) => d.docType === 'other').length === 0 ? (
                        <div className="empty-state">Henüz ek belge eklenmemiş.</div>
                      ) : (
                        documents.filter((d) => d.docType === 'other').map((d) => (
                          <div key={d.id} className="ledger-history-item">
                            <span style={{ flex: 1 }}>{d.label || 'Diğer Belge'}</span>
                            {d.fileUrl && (
                              <a href={d.fileUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12 }}>
                                📎 {d.fileName || 'Görüntüle'}
                              </a>
                            )}
                            <button type="button" className="task-row__delete" onClick={() => handleDeleteDocument(d.id)} title="Sil">✕</button>
                          </div>
                        ))
                      )}
                    </>
                  )}
                </div>
              )}

              {activeDetailTab === 'timeline' && (
                <div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                    <input
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="Örn: Müşteri 9.500.000 teklif etti"
                      style={{ flex: 1 }}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
                    />
                    <button type="button" className="btn btn-primary" style={{ fontSize: 12, padding: '6px 14px' }} disabled={savingNote || !newNote.trim()} onClick={handleAddNote}>
                      {savingNote ? '…' : 'Ekle'}
                    </button>
                  </div>
                  {notesLoading ? (
                    <div className="empty-state">Yükleniyor…</div>
                  ) : notes.length === 0 ? (
                    <div className="empty-state">Henüz not eklenmemiş.</div>
                  ) : (
                    notes.map((n) => (
                      <div key={n.id} className="ledger-history-item">
                        <span style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 12, whiteSpace: 'nowrap' }}>
                          {new Date(n.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                        </span>
                        <span style={{ flex: 1 }}>{n.text}</span>
                        <span style={{ color: 'var(--muted)', fontSize: 11 }}>{n.authorName}</span>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeDetailTab === 'collab' && (
                <div>
                  {!detailTx?.collaboratorAgentId ? (
                    <div className="finance-placeholder" style={{ margin: '0 auto' }}>
                      <div className="finance-placeholder__icon">🤝</div>
                      <div className="finance-placeholder__title">İşbirlikli Satış Değil</div>
                      <p className="finance-placeholder__text">
                        Bu işlemde müşteri ve portföy aynı danışmana ait (ya da biri harici) — işbirliği paylaşımı gerekmiyor.
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 0 }}>
                        Bu işlemde müşteri ve portföy <strong>farklı danışmanlara</strong> ait olduğu için otomatik olarak işbirlikli işaretlendi. Komisyon paylaşımının kesinleşmesi için <strong>her iki danışmanın da</strong> kendi ekranından onaylaması gerekir.
                      </p>

                      <div className="agent-card__profile-info" style={{ marginBottom: 16 }}>
                        <div className="agent-card__info-group">
                          <div className="agent-card__info-title">Taraflar</div>
                          <div className="agent-card__info-text">
                            {agentNameFor(detailTx.agentId)} (işlem sahibi) ↔ {agentNameFor(detailTx.collaboratorAgentId)} (işbirlikçi)
                          </div>
                        </div>
                        <div className="agent-card__info-group">
                          <div className="agent-card__info-title">Onay Durumu</div>
                          <div className="agent-card__info-text">
                            {detailTx.splitFinalizedAt ? (
                              <span style={{ color: '#1e7a3d', fontWeight: 600 }}>✅ Kesinleşti ({new Date(detailTx.splitFinalizedAt).toLocaleDateString('tr-TR')})</span>
                            ) : (
                              <>
                                {detailTx.splitApprovedByOwner ? '✅' : '⬜'} {agentNameFor(detailTx.agentId)}
                                {'  ·  '}
                                {detailTx.splitApprovedByCollaborator ? '✅' : '⬜'} {agentNameFor(detailTx.collaboratorAgentId)}
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
                        <div className="form-field" style={{ margin: 0 }}>
                          <label>{agentNameFor(detailTx.agentId)} Payı (%)</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={splitDraft}
                            onChange={(e) => setSplitDraft(e.target.value)}
                            style={{ width: 90 }}
                          />
                        </div>
                        <span style={{ fontSize: 12, color: 'var(--muted)', paddingBottom: 8 }}>
                          {agentNameFor(detailTx.collaboratorAgentId)} payı: %{splitDraft !== '' && !Number.isNaN(Number(splitDraft)) ? (100 - Number(splitDraft)).toFixed(1) : '—'}
                        </span>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          disabled={splitSaving}
                          onClick={handleUpdateSplit}
                        >
                          Oranı Güncelle
                        </button>
                        {!detailTx.splitFinalizedAt && (
                          <button
                            type="button"
                            className="btn btn-primary"
                            disabled={splitSaving}
                            onClick={handleApproveSplit}
                          >
                            {splitSaving ? '…' : 'Kendi Payımı Onayla'}
                          </button>
                        )}
                      </div>
                      <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 10 }}>
                        Not: Oranı değiştirmek, her iki tarafın onayını sıfırlar — taraflar yeni oranı tekrar onaylamalıdır. Bu paylaşım oranı bilgi amaçlıdır; gerçek komisyon kayıtları Finans → Komisyonlar bölümünden ayrıca girilmelidir.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
