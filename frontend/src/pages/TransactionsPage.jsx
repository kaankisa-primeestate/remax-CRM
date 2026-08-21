import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { transactionsApi, TRANSACTION_STAGES, TRANSACTION_DOC_TYPES } from '../api/transactions';
import { commissionsApi } from '../api/commissions';
import { customersApi, CUSTOMER_TYPES } from '../api/customers';
import { propertiesApi } from '../api/properties';
import { uploadFile } from '../api/client';
import { usersApi } from '../api/auth';
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

const DETAIL_TABS = [
  { key: 'summary', label: '📋 Özet' },
  { key: 'showing', label: '👁️ Gösterim' },
  { key: 'offer', label: '🏷️ Teklif' },
  { key: 'deed_checklist', label: '📑 Tapu Kontrol' },
  { key: 'financial', label: '💰 Kapanış & Komisyon' },
  { key: 'docs', label: '📁 Belgeler' },
  { key: 'timeline', label: '🕐 Zaman Akışı' },
  { key: 'collab', label: '🤝 İşbirliği' },
];

export default function TransactionsPage() {
  const { isBroker, user } = useAuth();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [agentRoster, setAgentRoster] = useState([]);

  // Form States
  const [customerMode, setCustomerMode] = useState('system');
  const [customerId, setCustomerId] = useState('');
  const [externalCustomerLabel, setExternalCustomerLabel] = useState('');
  const [propertyMode, setPropertyMode] = useState('system');
  const [propertyId, setPropertyId] = useState('');
  const [externalPropertyLabel, setExternalPropertyLabel] = useState('');
  const [offerAmount, setOfferAmount] = useState('');
  const [saving, setSaving] = useState(false);

  // Kanban / Drag
  const [draggedId, setDraggedId] = useState(null);
  const [dragOverStage, setDragOverStage] = useState(null);

  // Detail Modal
  const [detailTx, setDetailTx] = useState(null);
  const [activeDetailTab, setActiveDetailTab] = useState('summary');
  const [notes, setNotes] = useState([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [uploadingType, setUploadingType] = useState(null);
  const [otherLabel, setOtherLabel] = useState('');

  // Flow States
  const [showingDate, setShowingDate] = useState('');
  const [showingNote, setShowingNote] = useState('');
  const [savingShowing, setSavingShowing] = useState(false);

  const [offerValidityDate, setOfferValidityDate] = useState('');
  const [offerStatus, setOfferStatus] = useState('pending');
  const [offerNote, setOfferNote] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [depositDate, setDepositDate] = useState('');
  const [savingOffer, setSavingOffer] = useState(false);

  const [totalCommission, setTotalCommission] = useState('');
  const [agentCommission, setAgentCommission] = useState('');
  const [officeCommission, setOfficeCommission] = useState('');
  const [saleAmount, setSaleAmount] = useState('');
  const [savingCommission, setSavingCommission] = useState(false);

  const [splitDraft, setSplitDraft] = useState('50');
  const [splitSaving, setSplitSaving] = useState(false);

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

  async function openDetail(t) {
    setDetailTx(t);
    setActiveDetailTab('summary');

    // Load flow states
    setShowingDate(t.showingDate ? new Date(t.showingDate).toISOString().slice(0, 16) : '');
    setShowingNote(t.showingNote || '');

    setOfferAmount(t.offerAmount != null ? String(t.offerAmount) : '');
    setOfferValidityDate(t.offerValidityDate ? t.offerValidityDate.slice(0, 10) : '');
    setOfferStatus(t.offerStatus || 'pending');
    setOfferNote(t.offerNote || '');
    setDepositAmount(t.depositAmount != null ? String(t.depositAmount) : '');
    setDepositDate(t.depositDate ? t.depositDate.slice(0, 10) : '');

    setTotalCommission(t.totalCommissionAmount != null ? String(t.totalCommissionAmount) : '');
    setAgentCommission(t.agentCommissionAmount != null ? String(t.agentCommissionAmount) : '');
    setOfficeCommission(t.officeCommissionAmount != null ? String(t.officeCommissionAmount) : '');
    setSaleAmount(t.offerAmount != null ? String(t.offerAmount) : '');

    setSplitDraft(t.commissionSplitPercentage != null ? String(t.commissionSplitPercentage) : '50');

    setNotes([]);
    setDocuments([]);
    setNotesLoading(true);
    setDocumentsLoading(true);
    try {
      const list = await transactionsApi.getNotes(t.id);
      setNotes(list);
    } catch { setNotes([]); } finally { setNotesLoading(false); }

    try {
      const docs = await transactionsApi.getDocuments(t.id);
      setDocuments(docs);
    } catch { setDocuments([]); } finally { setDocumentsLoading(false); }
  }

  function closeDetail() { setDetailTx(null); setNewNote(''); }

  // --- FAZ 1 AKIŞ YÖNETİMİ METOTLARI ---

  async function handleSaveShowing() {
    if (!detailTx) return;
    setSavingShowing(true);
    try {
      const updated = await transactionsApi.update(detailTx.id, {
        showingDate: showingDate ? new Date(showingDate).toISOString() : undefined,
        showingNote: showingNote || undefined,
        stage: 'showing',
      });
      setDetailTx(updated);
      setTransactions((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      alert('Gösterim bilgileri kaydedildi ve aşama Gösterme olarak güncellendi.');
    } catch { alert('Gösterim kaydedilemedi.'); } finally { setSavingShowing(false); }
  }

  function handleSendWhatsAppShowing() {
    if (!detailTx) return;
    const cust = customers.find((c) => c.id === detailTx.customerId);
    const prop = properties.find((p) => p.id === detailTx.propertyId);
    const phone = cust?.phone?.replace(/\D/g, '');
    if (!phone) return alert('Müşterinin telefon numarası bulunamadı.');

    const msg = encodeURIComponent(`Merhaba ${cust?.firstName}, ${prop?.title || 'portföyümüz'} için gösterim randevunuz oluşturulmuştur. Tarih: ${showingDate ? new Date(showingDate).toLocaleString('tr-TR') : 'Belirtilmedi'}. İyi günler dileriz.`);
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
  }

  async function handleSaveOffer() {
    if (!detailTx) return;
    setSavingOffer(true);
    try {
      const updated = await transactionsApi.update(detailTx.id, {
        offerAmount: offerAmount ? Number(offerAmount) : undefined,
        offerValidityDate: offerValidityDate || undefined,
        offerStatus,
        offerNote: offerNote || undefined,
        depositAmount: depositAmount ? Number(depositAmount) : undefined,
        depositDate: depositDate || undefined,
        stage: 'offer',
      });
      setDetailTx(updated);
      setTransactions((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      alert('Teklif detayları başarıyla kaydedildi.');
    } catch { alert('Teklif bilgisi kaydedilemedi.'); } finally { setSavingOffer(false); }
  }

  async function handleToggleDeedChecklist(key) {
    if (!detailTx || !detailTx.deedChecklist) return;
    const updatedList = detailTx.deedChecklist.map((item) =>
      item.key === key ? { ...item, completed: !item.completed } : item
    );
    try {
      const updated = await transactionsApi.update(detailTx.id, { deedChecklist: updatedList });
      setDetailTx(updated);
      setTransactions((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } catch { alert('Kontrol maddesi güncellenemedi.'); }
  }

  async function handleSaveCommissionAndClose() {
    if (!detailTx) return;
    const saleAmountNum = Number(saleAmount);
    const totalCommissionNum = Number(totalCommission);
    const agentCommissionNum = Number(agentCommission);
    if (!saleAmountNum || !totalCommissionNum || !agentCommissionNum) {
      alert('Satış/Kira bedeli, toplam komisyon ve danışman payı doldurulmalıdır.');
      return;
    }
    setSavingCommission(true);
    try {
      // 1) Islemin kendi gorunum alanlarini guncelle (Kapanis sekmesi
      // tekrar acildiginda ayni degerlerin gorunmesi icin) ve asamayi
      // Kapanis'a tasi.
      const updated = await transactionsApi.update(detailTx.id, {
        totalCommissionAmount: totalCommissionNum,
        agentCommissionAmount: agentCommissionNum,
        officeCommissionAmount: officeCommission ? Number(officeCommission) : undefined,
        stage: 'closed',
      });
      setDetailTx(updated);
      setTransactions((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));

      // 2) GERCEK komisyon kaydini olustur -- bu, Cari Hesap ve Komisyonlar
      // listesinin besledigi TEK dogru kaynak. transactionId gonderildigi
      // icin backend, islem isbirlikliyse (collaboratorAgentId +
      // splitFinalizedAt doluysa) payi OTOMATIK olarak iki danismana
      // bolerek iki ayri kayit olusturur -- burada ekstra bir sey
      // yapmamiza gerek yok, ayni cagriyla hallediliyor.
      const property = properties.find((p) => p.id === detailTx.propertyId);
      await commissionsApi.create({
        transactionId: detailTx.id,
        propertyId: detailTx.propertyId || undefined,
        customerId: detailTx.customerId || undefined,
        propertyTitle: property?.title,
        transactionType: property?.listingType || 'sale',
        transactionAmount: saleAmountNum,
        commissionRate: (totalCommissionNum / saleAmountNum) * 100,
        agentSharePercent: (agentCommissionNum / totalCommissionNum) * 100,
        dueDate: new Date().toISOString().slice(0, 10),
        notes: 'İşlemler ekranından (Kapanış & Komisyon) otomatik oluşturuldu.',
      });

      alert(
        detailTx.collaboratorAgentId && detailTx.splitFinalizedAt
          ? 'Kapanış & Komisyon dökümü kaydedildi. İşbirlikli paylaşıma göre iki ayrı komisyon kaydı oluşturuldu ve işlem Broker onayına gönderildi.'
          : 'Kapanış & Komisyon dökümü kaydedildi. Komisyon kaydı oluşturuldu ve işlem Broker onayına gönderildi.',
      );
    } catch {
      alert('Komisyon kaydedilemedi.');
    } finally {
      setSavingCommission(false);
    }
  }

  async function handleAddNote() {
    if (!newNote.trim() || !detailTx) return;
    setSavingNote(true);
    try {
      const saved = await transactionsApi.addNote(detailTx.id, newNote.trim());
      setNotes((prev) => [saved, ...prev]);
      setNewNote('');
    } catch { alert('Not eklenemedi.'); } finally { setSavingNote(false); }
  }

  function latestDocFor(docType) { return documents.find((d) => d.docType === docType) || null; }

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
    } catch { alert('Dosya yüklenemedi.'); } finally { setUploadingType(null); }
  }

  async function handleMarkDocumentDone(docType) {
    if (!detailTx) return;
    setUploadingType(docType);
    try {
      const saved = await transactionsApi.addDocument(detailTx.id, { docType, completed: true });
      setDocuments((prev) => [saved, ...prev]);
    } catch { alert('İşaretlenemedi.'); } finally { setUploadingType(null); }
  }

  async function handleDeleteDocument(documentId) {
    if (!confirm('Bu belge silinsin mi?')) return;
    setDocuments((prev) => prev.filter((d) => d.id !== documentId));
    try { await transactionsApi.removeDocument(documentId); } catch { if (detailTx) openDetail(detailTx); }
  }

  async function handleUpdateSplit() {
    if (!detailTx) return;
    const pct = Number(splitDraft);
    if (Number.isNaN(pct) || pct < 0 || pct > 100) return alert('Geçerli oran girin.');
    setSplitSaving(true);
    try {
      const updated = await transactionsApi.updateSplit(detailTx.id, pct);
      setDetailTx(updated);
      setTransactions((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } catch { alert('Güncellenemedi.'); } finally { setSplitSaving(false); }
  }

  async function handleApproveSplit() {
    if (!detailTx) return;
    setSplitSaving(true);
    try {
      const updated = await transactionsApi.approveSplit(detailTx.id);
      setDetailTx(updated);
      setTransactions((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } catch { alert('Onaylanamadı.'); } finally { setSplitSaving(false); }
  }

  const detailCustomer = detailTx ? customers.find((c) => c.id === detailTx.customerId) : null;
  const detailProperty = detailTx ? properties.find((p) => p.id === detailTx.propertyId) : null;

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
                          <div className="transaction-card__title" onClick={() => openDetail(t)} style={{ cursor: 'pointer' }}>
                            {property ? property.title : (t.externalPropertyLabel || '📋 Portföy Belirlenmedi')}
                          </div>
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

      {/* DETAY VE SÜREÇ YÖNETİMİ MODAL PANELİ */}
      {detailTx && (
        <div className="modal-backdrop" onClick={closeDetail}>
          <div className="modal" style={{ maxWidth: 700 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h2 style={{ margin: 0 }}>{detailProperty?.title || detailTx.externalPropertyLabel || 'İşlem Yönetimi'}</h2>
              <button type="button" className="office-modal__close" onClick={closeDetail}>✕</button>
            </div>

            <div className="folder-tabs" style={{ flexWrap: 'wrap' }}>
              {DETAIL_TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  className={`folder-tab${activeDetailTab === tab.key ? ' active' : ''}`}
                  onClick={() => setActiveDetailTab(tab.key)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="finance-tab-content" style={{ maxHeight: '60vh', overflowY: 'auto', paddingTop: 16 }}>
              {/* ÖZET SEKMESİ */}
              {activeDetailTab === 'summary' && (
                <div>
                  <h4 style={{ marginTop: 0 }}>Müşteri: {detailCustomer ? `${detailCustomer.firstName} ${detailCustomer.lastName}` : (detailTx.externalCustomerLabel || '—')}</h4>
                  <h4>Portföy: {detailProperty ? detailProperty.title : (detailTx.externalPropertyLabel || '—')}</h4>
                  <p>Mevcut Aşama: <strong>{TRANSACTION_STAGES.find((s) => s.value === detailTx.stage)?.label}</strong></p>
                </div>
              )}

              {/* GÖSTERİM SEKMESİ (7.2) */}
              {activeDetailTab === 'showing' && (
                <div>
                  <h4>👁️ Yer Gösterme & Buluşma Detayları</h4>
                  <div className="form-field" style={{ marginBottom: 10 }}>
                    <label>Gösterim Tarihi & Saati</label>
                    <input type="datetime-local" value={showingDate} onChange={(e) => setShowingDate(e.target.value)} />
                  </div>
                  <div className="form-field" style={{ marginBottom: 10 }}>
                    <label>Gösterim Notları & Geri Bildirim</label>
                    <textarea rows="3" value={showingNote} onChange={(e) => setShowingNote(e.target.value)} placeholder="Müşteri beğendi mi? Fiyat hakkında ne düşündü?" style={{ width: '100%', padding: 8 }} />
                  </div>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 10 }}>
                    <button type="button" className="btn btn-primary" onClick={handleSaveShowing} disabled={savingShowing}>
                      {savingShowing ? 'Kaydediliyor…' : 'Gösterim Bilgisini Kaydet'}
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={handleSendWhatsAppShowing}>
                      💬 WhatsApp Randevu Mesajı Gönder
                    </button>
                  </div>
                </div>
              )}

              {/* TEKLİF SEKMESİ (7.3) */}
              {activeDetailTab === 'offer' && (
                <div>
                  <h4>🏷️ Teklif & Kaparo Yönetimi</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                    <div className="form-field">
                      <label>Teklif Tutarı (TL)</label>
                      <input type="number" value={offerAmount} onChange={(e) => setOfferAmount(e.target.value)} placeholder="0.00" />
                    </div>
                    <div className="form-field">
                      <label>Teklif Geçerlilik Tarihi</label>
                      <input type="date" value={offerValidityDate} onChange={(e) => setOfferValidityDate(e.target.value)} />
                    </div>
                  </div>
                  <div className="form-field" style={{ marginBottom: 10 }}>
                    <label>Teklif Durumu</label>
                    <select value={offerStatus} onChange={(e) => setOfferStatus(e.target.value)}>
                      <option value="pending">⏳ Beklemede</option>
                      <option value="accepted">✅ Kabul Edildi</option>
                      <option value="rejected">❌ Reddedildi</option>
                      <option value="withdrawn">↩️ Geri Çekildi</option>
                    </select>
                  </div>
                  <div className="form-field" style={{ marginBottom: 10 }}>
                    <label>Teklif Açıklaması / Notlar</label>
                    <input type="text" value={offerNote} onChange={(e) => setOfferNote(e.target.value)} placeholder="Örn: Mutfak dolaplarının yapılması şartıyla teklif verildi" />
                  </div>

                  <h5 style={{ marginTop: 15, marginBottom: 5 }}>Kaparo / Depozito</h5>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                    <div className="form-field">
                      <label>Kaparo Tutarı (TL)</label>
                      <input type="number" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} placeholder="0.00" />
                    </div>
                    <div className="form-field">
                      <label>Kaparo Tarihi</label>
                      <input type="date" value={depositDate} onChange={(e) => setDepositDate(e.target.value)} />
                    </div>
                  </div>

                  <button type="button" className="btn btn-primary" onClick={handleSaveOffer} disabled={savingOffer}>
                    {savingOffer ? 'Kaydediliyor…' : 'Teklif & Kaparo Bilgilerini Kaydet'}
                  </button>
                </div>
              )}

              {/* TAPU KONTROL LİSTESİ (7.4) */}
              {activeDetailTab === 'deed_checklist' && (
                <div>
                  <h4>📑 Tapu Öncesi Kontrol Listesi</h4>
                  <p style={{ fontSize: 12, color: 'var(--muted)' }}>Satış/Kapanış öncesinde tamamlanması gereken resmi adımları işaretleyin:</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
                    {detailTx.deedChecklist?.map((item) => (
                      <label key={item.key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: item.completed ? '#e6f4ea' : '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 4, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={item.completed}
                          onChange={() => handleToggleDeedChecklist(item.key)}
                          style={{ width: 'auto' }}
                        />
                        <span style={{ fontSize: 13, fontWeight: item.completed ? 'bold' : 'normal', color: item.completed ? '#1e7a3d' : 'inherit' }}>
                          {item.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* KAPANIS VE KOMISYON (7.5) */}
              {activeDetailTab === 'financial' && (
                <div>
                  <h4>💰 Kapanış & Komisyon Dökümü</h4>
                  {detailTx?.collaboratorAgentId && (
                    <div
                      style={{
                        background: detailTx.splitFinalizedAt ? '#e6f4ea' : '#fdf3e0',
                        borderRadius: 6,
                        padding: '10px 12px',
                        marginBottom: 14,
                        fontSize: 12.5,
                      }}
                    >
                      🤝 Bu işlem <strong>işbirlikli</strong> — komisyon otomatik olarak{' '}
                      <strong>{agentNameFor(detailTx.agentId)} (%{detailTx.commissionSplitPercentage ?? 50})</strong> ve{' '}
                      <strong>{agentNameFor(detailTx.collaboratorAgentId)} (%{100 - (detailTx.commissionSplitPercentage ?? 50)})</strong> arasında bölünecek.
                      {!detailTx.splitFinalizedAt && ' ⚠️ Paylaşım henüz iki taraftan da onaylanmadı — komisyon kaydı yine de oluşturulur, ama pay oranı bu son onaylı haline göre hesaplanır.'}
                    </div>
                  )}
                  <div className="form-field" style={{ marginBottom: 10 }}>
                    <label>Satış / Kira Bedeli (TL)</label>
                    <input type="number" value={saleAmount} onChange={(e) => setSaleAmount(e.target.value)} placeholder="0.00" />
                  </div>
                  <div className="form-field" style={{ marginBottom: 10 }}>
                    <label>Toplam Hizmet Bedeli / Komisyon (TL)</label>
                    <input type="number" value={totalCommission} onChange={(e) => setTotalCommission(e.target.value)} placeholder="0.00" />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                    <div className="form-field">
                      <label>Danışman Payı (TL)</label>
                      <input type="number" value={agentCommission} onChange={(e) => setAgentCommission(e.target.value)} placeholder="0.00" />
                    </div>
                    <div className="form-field">
                      <label>Ofis Payı (TL)</label>
                      <input type="number" value={officeCommission} onChange={(e) => setOfficeCommission(e.target.value)} placeholder="0.00" />
                    </div>
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: -4, marginBottom: 10 }}>
                    Bu ekran, gerçek bir komisyon kaydı oluşturur — Cari Hesabına ve Komisyonlar listene otomatik yansır.
                  </p>
                  <button type="button" className="btn btn-primary" onClick={handleSaveCommissionAndClose} disabled={savingCommission} style={{ marginTop: 10 }}>
                    {savingCommission ? 'İşlem Onaya Gönderiliyor…' : '✓ Kapanışı Yap & Broker Onayına Gönder'}
                  </button>
                </div>
              )}

              {/* BELGELER SEKMESİ */}
              {activeDetailTab === 'docs' && (
                <div>
                  {TRANSACTION_DOC_TYPES.map((dt) => {
                    const latest = latestDocFor(dt.value);
                    return (
                      <div key={dt.value} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #e2e8f0' }}>
                        <span>{dt.label} {latest?.completed ? '✅' : '⬜'}</span>
                        <label className="btn btn-secondary" style={{ fontSize: 11 }}>
                          Yükle <input type="file" style={{ display: 'none' }} onChange={(e) => e.target.files?.[0] && handleUploadDocument(dt.value, e.target.files[0])} />
                        </label>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ZAMAN AKIŞI SEKMESİ */}
              {activeDetailTab === 'timeline' && (
                <div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                    <input value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="İşlem notu..." style={{ flex: 1 }} />
                    <button type="button" className="btn btn-primary" onClick={handleAddNote}>Ekle</button>
                  </div>
                  {notes.map((n) => (
                    <div key={n.id} style={{ fontSize: 12, borderBottom: '1px solid #eee', padding: '4px 0' }}>
                      <strong>{n.authorName}:</strong> {n.text}
                    </div>
                  ))}
                </div>
              )}

              {/* İŞBİRLİĞİ SEKMESİ */}
              {activeDetailTab === 'collab' && (
                <div>
                  {detailTx?.collaboratorAgentId ? (
                    <div>
                      <p>Müşteri & Portföy sahibi farklı danışmanlardır. İşbirlikli satış aktiftir.</p>
                      <input type="number" value={splitDraft} onChange={(e) => setSplitDraft(e.target.value)} style={{ width: 80 }} /> % Pay
                      <button type="button" className="btn btn-secondary" onClick={handleUpdateSplit} disabled={splitSaving}>Güncelle</button>
                      <button type="button" className="btn btn-primary" onClick={handleApproveSplit} disabled={splitSaving}>Onayla</button>
                    </div>
                  ) : (
                    <p>İşbirlikli satış değil.</p>
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
