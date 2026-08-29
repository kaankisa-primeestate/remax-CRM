import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { transactionsApi, TRANSACTION_STAGES, TRANSACTION_DOC_TYPES } from '../api/transactions';
import { commissionsApi } from '../api/commissions';
import { customersApi } from '../api/customers';
import { propertiesApi } from '../api/properties';
import { uploadFile } from '../api/client';
import { usersApi } from '../api/auth';
import { useAuth } from '../context/AuthContext.jsx';

const money = (n) =>
  n ? new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(n) : null;

// "Aktivite Akisi" varsayilan/ilk sekme -- HubSpot/Salesforce'un kanitlanmis
// "kayit sayfasi" deseninde oldugu gibi, bir islemi actiginda once onun
// KRONOLOJIK HIKAYESINI gormelisin, bir forma degil.
const ACTION_TABS = [
  { key: 'activity', label: '🕐 Aktivite Akışı' },
  { key: 'showing', label: '👁️ Gösterim' },
  { key: 'offer', label: '🏷️ Teklif' },
  { key: 'deed_checklist', label: '📑 Tapu Kontrol' },
  { key: 'financial', label: '💰 Kapanış & Komisyon' },
];

export default function TransactionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isBroker } = useAuth();

  const [tx, setTx] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [property, setProperty] = useState(null);
  const [agentRoster, setAgentRoster] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('activity');

  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [otherLabel, setOtherLabel] = useState('');

  const [showingDate, setShowingDate] = useState('');
  const [showingNote, setShowingNote] = useState('');
  const [savingShowing, setSavingShowing] = useState(false);

  const [offerAmount, setOfferAmount] = useState('');
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
  // Danismanin KAYITLI komisyon orani (kayit ekraninda tanimlanan) --
  // "Toplam Komisyon" girildiginde Danisman Payi'ni OTOMATIK hesaplamak
  // icin kullanilir. Kullanici hala elle DEGISTIREBILIR (zorunlu degil).
  const [agentSharePercent, setAgentSharePercent] = useState(null);
  const [agentShareTouched, setAgentShareTouched] = useState(false);

  const [splitDraft, setSplitDraft] = useState('50');
  const [splitSaving, setSplitSaving] = useState(false);
  const [rejectNote, setRejectNote] = useState('');
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [approvalSaving, setApprovalSaving] = useState(false);

  function agentNameFor(agentId) {
    return agentRoster.find((a) => a.id === agentId)?.name || 'Bilinmeyen';
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const t = await transactionsApi.get(id);
      setTx(t);
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
      // Eger bu islemde ZATEN kayitli bir danisman payi varsa (daha once
      // girilmis/kaydedilmis), otomatik hesaplama bunun UZERINE YAZMASIN
      // -- kullanicinin onceki girisi/duzenlemesi korunur.
      setAgentShareTouched(t.agentCommissionAmount != null);
      setSaleAmount(t.offerAmount != null ? String(t.offerAmount) : '');
      setSplitDraft(t.commissionSplitPercentage != null ? String(t.commissionSplitPercentage) : '50');

      const [notesList, docsList, roster] = await Promise.all([
        transactionsApi.getNotes(id).catch(() => []),
        transactionsApi.getDocuments(id).catch(() => []),
        usersApi.listAgentRoster().catch(() => []),
      ]);
      setNotes(notesList);
      setDocuments(docsList);
      setAgentRoster(roster);

      // Danismanin KAYITLI komisyon oranini cek -- Broker ise TUM
      // danisman listesinden (zengin veri, sadece Broker'a acik) ilgili
      // danismani bulur; Danisman ise SADECE kendi profilini cekebilir
      // (yetki kisitlamasi nedeniyle), zaten kendi islemi oldugu icin yeterli.
      try {
        if (isBroker) {
          const allAgents = await usersApi.listAgents();
          const owner = allAgents.find((a) => a.id === t.agentId);
          setAgentSharePercent(owner?.commissionSharePercentage ?? null);
        } else {
          const me = await usersApi.getMe();
          setAgentSharePercent(me?.commissionSharePercentage ?? null);
        }
      } catch {
        setAgentSharePercent(null);
      }

      if (t.customerId) customersApi.getOne(t.customerId).then(setCustomer).catch(() => setCustomer(null));
      if (t.propertyId) propertiesApi.getOne(t.propertyId).then(setProperty).catch(() => setProperty(null));
    } catch {
      setTx(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // "Toplam Komisyon" girildiginde, eger kullanici HENUZ "Danisman Payi"na
  // elle dokunmadiysa (agentShareTouched=false), danismanin KAYITLI
  // oranina gore OTOMATIK hesapla -- ama kullanici isterse ustune yazip
  // DEGISTIREBILIR (bkz. handleAgentCommissionChange).
  useEffect(() => {
    if (agentShareTouched) return;
    if (agentSharePercent == null) return;
    const total = Number(totalCommission);
    if (!total) return;
    const computed = Math.round(((total * agentSharePercent) / 100) * 100) / 100;
    setAgentCommission(String(computed));
    setOfficeCommission(String(Math.round((total - computed) * 100) / 100));
  }, [totalCommission, agentSharePercent, agentShareTouched]);

  function handleAgentCommissionChange(value) {
    setAgentShareTouched(true);
    setAgentCommission(value);
    const total = Number(totalCommission);
    if (total) {
      setOfficeCommission(String(Math.round((total - Number(value || 0)) * 100) / 100));
    }
  }

  async function handleSaveShowing() {
    setSavingShowing(true);
    try {
      const updated = await transactionsApi.update(id, {
        showingDate: showingDate ? new Date(showingDate).toISOString() : undefined,
        showingNote: showingNote || undefined,
        stage: 'showing',
      });
      setTx(updated);
      const fresh = await transactionsApi.getNotes(id);
      setNotes(fresh);
      alert('Gösterim bilgileri kaydedildi ve aşama Gösterme olarak güncellendi.');
    } catch {
      alert('Gösterim kaydedilemedi.');
    } finally {
      setSavingShowing(false);
    }
  }

  function handleSendWhatsAppShowing() {
    const phone = customer?.phone?.replace(/\D/g, '');
    if (!phone) return alert('Müşterinin telefon numarası bulunamadı.');
    const msg = encodeURIComponent(
      `Merhaba ${customer?.firstName}, ${property?.title || 'portföyümüz'} için gösterim randevunuz oluşturulmuştur. Tarih: ${showingDate ? new Date(showingDate).toLocaleString('tr-TR') : 'Belirtilmedi'}. İyi günler dileriz.`,
    );
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
  }

  async function handleSaveOffer() {
    setSavingOffer(true);
    try {
      const updated = await transactionsApi.update(id, {
        offerAmount: offerAmount ? Number(offerAmount) : undefined,
        offerValidityDate: offerValidityDate || undefined,
        offerStatus,
        offerNote: offerNote || undefined,
        depositAmount: depositAmount ? Number(depositAmount) : undefined,
        depositDate: depositDate || undefined,
        stage: 'offer',
      });
      setTx(updated);
      const fresh = await transactionsApi.getNotes(id);
      setNotes(fresh);
      alert('Teklif detayları başarıyla kaydedildi.');
    } catch {
      alert('Teklif bilgisi kaydedilemedi.');
    } finally {
      setSavingOffer(false);
    }
  }

  async function handleToggleDeedChecklist(key) {
    if (!tx?.deedChecklist) return;
    const updatedList = tx.deedChecklist.map((item) => (item.key === key ? { ...item, completed: !item.completed } : item));
    try {
      const updated = await transactionsApi.update(id, { deedChecklist: updatedList });
      setTx(updated);
    } catch {
      alert('Kontrol maddesi güncellenemedi.');
    }
  }

  async function handleSaveCommissionAndClose() {
    const saleAmountNum = Number(saleAmount);
    const totalCommissionNum = Number(totalCommission);
    const agentCommissionNum = Number(agentCommission);
    if (!saleAmountNum || !totalCommissionNum || !agentCommissionNum) {
      alert('Satış/Kira bedeli, toplam komisyon ve danışman payı doldurulmalıdır.');
      return;
    }
    setSavingCommission(true);
    try {
      const updated = await transactionsApi.update(id, {
        totalCommissionAmount: totalCommissionNum,
        agentCommissionAmount: agentCommissionNum,
        officeCommissionAmount: officeCommission ? Number(officeCommission) : undefined,
        stage: 'closed',
      });
      setTx(updated);
      const fresh = await transactionsApi.getNotes(id);
      setNotes(fresh);

      await commissionsApi.create({
        transactionId: id,
        propertyId: tx.propertyId || undefined,
        customerId: tx.customerId || undefined,
        propertyTitle: property?.title,
        transactionType: property?.listingType || 'sale',
        transactionAmount: saleAmountNum,
        commissionRate: (totalCommissionNum / saleAmountNum) * 100,
        agentSharePercent: (agentCommissionNum / totalCommissionNum) * 100,
        dueDate: new Date().toISOString().slice(0, 10),
        notes: 'İşlem Dosyası ekranından (Kapanış & Komisyon) otomatik oluşturuldu.',
      });

      alert(
        tx.collaboratorAgentId && tx.splitFinalizedAt
          ? 'Kapanış & Komisyon dökümü kaydedildi. İşbirlikli paylaşıma göre iki ayrı komisyon kaydı oluşturuldu ve işlem Broker onayına gönderildi.'
          : 'Kapanış & Komisyon dökümü kaydedildi. Komisyon kaydı oluşturuldu ve işlem Broker onayına gönderildi.',
      );
    } catch {
      alert('Komisyon kaydedilemedi.');
    } finally {
      setSavingCommission(false);
    }
  }

  // Broker icin: satis/kapanis OZETINI gorup, TEK adimda onayla ya da
  // itiraz notu yazip Danismana geri gonder. Eskiden Broker "Onayla"
  // butonuna (Islemler listesinde) tikladiginda HICBIR OZET GORMEDEN,
  // dogrudan onaylaniyordu -- kullanicinin "ne onayladigimi bilmiyorum"
  // sikayeti buradan geliyordu.
  async function handleApproveDeal() {
    setApprovalSaving(true);
    try {
      const updated = await transactionsApi.update(id, { dealApproved: true });
      setTx(updated);
      const fresh = await transactionsApi.getNotes(id);
      setNotes(fresh);
    } catch (err) {
      const message = err?.response?.data?.message ?? 'Onaylanamadı.';
      alert(Array.isArray(message) ? message.join(', ') : message);
    } finally {
      setApprovalSaving(false);
    }
  }

  async function handleSendRejectNote() {
    if (!rejectNote.trim()) return;
    setApprovalSaving(true);
    try {
      await transactionsApi.addNote(id, `⚠️ Broker itirazı: ${rejectNote.trim()}`);
      const fresh = await transactionsApi.getNotes(id);
      setNotes(fresh);
      setRejectNote('');
      setShowRejectBox(false);
      alert('İtiraz notu danışmana iletildi.');
    } catch {
      alert('Not gönderilemedi, tekrar deneyin.');
    } finally {
      setApprovalSaving(false);
    }
  }

  async function handleAddNote() {
    if (!newNote.trim()) return;
    setSavingNote(true);
    try {
      const saved = await transactionsApi.addNote(id, newNote.trim());
      setNotes((prev) => [saved, ...prev]);
      setNewNote('');
    } catch {
      alert('Not eklenemedi.');
    } finally {
      setSavingNote(false);
    }
  }

  function latestDocFor(docType) {
    return documents.find((d) => d.docType === docType) || null;
  }

  async function handleUploadDocument(docType, file, label) {
    if (!file) return;
    try {
      const url = await uploadFile(file);
      const saved = await transactionsApi.addDocument(id, { docType, label: label || undefined, fileUrl: url, fileName: file.name });
      setDocuments((prev) => [saved, ...prev]);
      const fresh = await transactionsApi.getNotes(id);
      setNotes(fresh);
      if (docType === 'other') setOtherLabel('');
    } catch {
      alert('Dosya yüklenemedi.');
    }
  }

  async function handleDeleteDocument(documentId) {
    if (!confirm('Bu belge silinsin mi?')) return;
    setDocuments((prev) => prev.filter((d) => d.id !== documentId));
    try {
      await transactionsApi.removeDocument(documentId);
      const fresh = await transactionsApi.getNotes(id);
      setNotes(fresh);
    } catch {
      load();
    }
  }

  async function handleFlagForBroker(docLabel) {
    const note = prompt(`Broker'a hangi düzeltmeyi bildirmek istiyorsun? (${docLabel})`);
    if (!note || !note.trim()) return;
    try {
      const saved = await transactionsApi.addNote(id, `⚠️ Broker'a bildirim: ${note.trim()} (${docLabel})`, true);
      setNotes((prev) => [saved, ...prev]);
      alert("Broker'a bildirildi — Aktivite Akışı'na kaydedildi ve Broker'ın Aksiyon Merkezi'nde görünecek.");
    } catch {
      alert('Bildirim gönderilemedi, tekrar deneyin.');
    }
  }

  async function handleEditDocumentLabel(doc) {
    const newLabel = prompt('Belge açıklaması / etiketi:', doc.label || '');
    if (newLabel === null) return;
    try {
      const updated = await transactionsApi.updateDocument(doc.id, { docType: doc.docType, label: newLabel });
      setDocuments((prev) => prev.map((d) => (d.id === doc.id ? updated : d)));
      const fresh = await transactionsApi.getNotes(id);
      setNotes(fresh);
    } catch {
      alert('Güncellenemedi, tekrar deneyin.');
    }
  }

  async function handleUpdateSplit() {
    const pct = Number(splitDraft);
    if (Number.isNaN(pct) || pct < 0 || pct > 100) return alert('Geçerli oran girin.');
    setSplitSaving(true);
    try {
      const updated = await transactionsApi.updateSplit(id, pct);
      setTx(updated);
    } catch {
      alert('Güncellenemedi.');
    } finally {
      setSplitSaving(false);
    }
  }

  async function handleApproveSplit() {
    setSplitSaving(true);
    try {
      const updated = await transactionsApi.approveSplit(id);
      setTx(updated);
    } catch {
      alert('Onaylanamadı.');
    } finally {
      setSplitSaving(false);
    }
  }

  if (loading) {
    return <div className="empty-state">Yükleniyor…</div>;
  }
  if (!tx) {
    return <div className="empty-state">İşlem bulunamadı ya da erişim yetkiniz yok.</div>;
  }

  const stageLabel = TRANSACTION_STAGES.find((s) => s.value === tx.stage)?.label;

  return (
    <div>
      <button
        type="button"
        onClick={() => navigate('/islemler')}
        style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--muted)', background: 'transparent', border: 'none', padding: 0, marginBottom: 12, cursor: 'pointer', display: 'block' }}
      >
        ← İşlemler Panosuna Dön
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
        <div>
          <h2 className="dossier__name" style={{ margin: 0 }}>{property?.title || tx.externalPropertyLabel || 'İşlem Dosyası'}</h2>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--muted)' }}>
            {customer ? `${customer.firstName} ${customer.lastName}` : tx.externalCustomerLabel || 'Müşteri belirtilmemiş'}
          </p>
        </div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, background: 'var(--ink-navy)', color: 'white', borderRadius: 999, padding: '5px 14px' }}>
          {stageLabel}
        </span>
      </div>

      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* SOL SUTUN: Ozet + Belgeler + Bagli Kayitlar */}
        <div style={{ flex: '1 1 280px', minWidth: 260, maxWidth: 340 }}>
          <div className="folder-panel" style={{ marginBottom: 16 }}>
            <h4 style={{ marginTop: 0, fontSize: 13, color: 'var(--muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>Özet</h4>
            {customer ? (
              <Link to={`/musteriler/${customer.id}`} style={{ display: 'block', marginBottom: 6, fontSize: 13 }}>👤 {customer.firstName} {customer.lastName} →</Link>
            ) : (
              <div style={{ fontSize: 13, marginBottom: 6 }}>👤 {tx.externalCustomerLabel || '—'}</div>
            )}
            {property ? (
              <Link to={`/portfoyler/${property.id}`} style={{ display: 'block', marginBottom: 6, fontSize: 13 }}>🏠 {property.title} →</Link>
            ) : (
              <div style={{ fontSize: 13, marginBottom: 6 }}>🏠 {tx.externalPropertyLabel || '—'}</div>
            )}
            {tx.offerAmount && <div style={{ fontSize: 13, marginBottom: 4 }}>🏷️ Teklif: {money(tx.offerAmount)}</div>}
            {tx.showingDate && <div style={{ fontSize: 12, color: 'var(--muted)' }}>👁️ Gösterim: {new Date(tx.showingDate).toLocaleString('tr-TR')}</div>}
            {tx.collaboratorAgentId && (
              <div style={{ marginTop: 8, fontSize: 11, background: tx.splitFinalizedAt ? '#e6f4ea' : '#fdf3e0', borderRadius: 6, padding: '6px 8px' }}>
                🤝 İşbirlikli{tx.splitFinalizedAt ? '' : ' · onay bekliyor'}
              </div>
            )}
            {tx.stage === 'closed' && (
              <div style={{ marginTop: 8 }} className={tx.dealApproved ? 'deal-approval-badge deal-approval-badge--ok' : 'deal-approval-badge'}>
                {tx.dealApproved ? '✓ Broker onayladı' : '⏳ Broker onayı bekliyor'}
              </div>
            )}
          </div>

          <div className="folder-panel">
            <h4 style={{ marginTop: 0, fontSize: 13, color: 'var(--muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>📁 Belgeler</h4>
            {TRANSACTION_DOC_TYPES.map((dt) => {
              const latest = latestDocFor(dt.value);
              return (
                <div key={dt.value} style={{ padding: '8px 0', borderBottom: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, fontSize: 12 }}>{dt.label} {latest?.fileUrl || latest?.completed ? '✅' : '⬜'}</span>
                    <label className="btn btn-secondary" style={{ fontSize: 10, padding: '3px 8px' }}>
                      {latest?.fileUrl ? 'Değiştir' : 'Yükle'}
                      <input type="file" style={{ display: 'none' }} onChange={(e) => e.target.files?.[0] && handleUploadDocument(dt.value, e.target.files[0])} />
                    </label>
                  </div>
                  {latest && (
                    <div style={{ marginTop: 4, fontSize: 10.5, color: 'var(--muted)' }}>
                      {latest.fileUrl && <a href={latest.fileUrl} target="_blank" rel="noreferrer" style={{ display: 'block', marginBottom: 2 }}>📎 {latest.fileName || 'Dosyayı Gör'}</a>}
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button type="button" onClick={() => handleEditDocumentLabel(latest)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-navy)', fontSize: 10 }}>✎ Düzenle</button>
                        {isBroker ? (
                          <button type="button" onClick={() => handleDeleteDocument(latest.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: 10 }}>🗑 Sil</button>
                        ) : (
                          <button type="button" onClick={() => handleFlagForBroker(dt.label)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8a6100', fontSize: 10 }}>⚠️ Broker'a Bildir</button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            <div style={{ marginTop: 10 }}>
              <h5 style={{ margin: '0 0 6px', fontSize: 11, color: 'var(--muted)' }}>Diğer Belgeler</h5>
              {documents.filter((d) => d.docType === 'other').map((d) => (
                <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 10.5 }}>
                  <span>{d.fileUrl ? <a href={d.fileUrl} target="_blank" rel="noreferrer">📎 {d.label || d.fileName}</a> : (d.label || 'Etiketsiz')}</span>
                  {isBroker ? (
                    <button type="button" onClick={() => handleDeleteDocument(d.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)' }}>🗑</button>
                  ) : (
                    <button type="button" onClick={() => handleFlagForBroker(d.label || 'Diğer Belge')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8a6100' }}>⚠️</button>
                  )}
                </div>
              ))}
              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                <input value={otherLabel} onChange={(e) => setOtherLabel(e.target.value)} placeholder="Belge adı" style={{ flex: 1, fontSize: 11 }} />
                <label className="btn btn-secondary" style={{ fontSize: 10 }}>
                  + Ekle
                  <input type="file" style={{ display: 'none' }} onChange={(e) => e.target.files?.[0] && otherLabel.trim() && handleUploadDocument('other', e.target.files[0], otherLabel.trim())} />
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* ANA SUTUN: Aksiyon sekmeleri */}
        <div style={{ flex: '2 1 480px', minWidth: 320 }}>
          <div className="folder-tabs" style={{ flexWrap: 'wrap' }}>
            {ACTION_TABS.map((tab) => (
              <button key={tab.key} type="button" className={`folder-tab${activeTab === tab.key ? ' active' : ''}`} onClick={() => setActiveTab(tab.key)}>
                {tab.label}
              </button>
            ))}
            {tx.collaboratorAgentId && (
              <button type="button" className={`folder-tab${activeTab === 'collab' ? ' active' : ''}`} onClick={() => setActiveTab('collab')}>
                🤝 İşbirliği
              </button>
            )}
          </div>

          <div className="folder-panel" style={{ marginTop: 0, borderTopLeftRadius: 0 }}>
            {activeTab === 'activity' && (
              <div>
                <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 0 }}>
                  Bu işlemin başından (Talep) bugüne kadarki tüm hikayesi — aşama değişimleri, belge işlemleri ve notlar otomatik olarak burada birikir.
                </p>
                <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                  <input value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Elle not ekle…" style={{ flex: 1 }} onKeyDown={(e) => e.key === 'Enter' && handleAddNote()} />
                  <button type="button" className="btn btn-primary" disabled={savingNote || !newNote.trim()} onClick={handleAddNote}>Ekle</button>
                </div>
                {notes.length === 0 ? (
                  <div className="empty-state">Henüz bir aktivite yok.</div>
                ) : (
                  notes.map((n) => (
                    <div key={n.id} style={{ fontSize: 12.5, borderLeft: '2px solid var(--paper-line)', paddingLeft: 10, marginBottom: 12 }}>
                      <div>{n.text}</div>
                      <div style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 2 }}>
                        {n.authorName} · {new Date(n.createdAt).toLocaleString('tr-TR')}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'showing' && (
              <div>
                <h4 style={{ marginTop: 0 }}>👁️ Yer Gösterme & Buluşma Detayları</h4>
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

            {activeTab === 'offer' && (
              <div>
                <h4 style={{ marginTop: 0 }}>🏷️ Teklif & Kaparo Yönetimi</h4>
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

            {activeTab === 'deed_checklist' && (
              <div>
                <h4 style={{ marginTop: 0 }}>📑 Tapu Öncesi Kontrol Listesi</h4>
                <p style={{ fontSize: 12, color: 'var(--muted)' }}>Satış/Kapanış öncesinde tamamlanması gereken resmi adımları işaretleyin:</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
                  {tx.deedChecklist?.map((item) => (
                    <label key={item.key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: item.completed ? '#e6f4ea' : '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 4, cursor: 'pointer' }}>
                      <input type="checkbox" checked={item.completed} onChange={() => handleToggleDeedChecklist(item.key)} style={{ width: 'auto' }} />
                      <span style={{ fontSize: 13, fontWeight: item.completed ? 'bold' : 'normal', color: item.completed ? '#1e7a3d' : 'inherit' }}>{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'financial' && (
              <div>
                <h4 style={{ marginTop: 0 }}>💰 Kapanış & Komisyon Dökümü</h4>
                {isBroker && tx.stage === 'closed' && !tx.dealApproved && (
                  <div style={{ background: '#fdf3e0', border: '1px solid #e8d5a8', borderRadius: 6, padding: '14px', marginBottom: 16 }}>
                    <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 600 }}>
                      ⏳ Bu işlem onayınızı bekliyor — aşağıdaki kapanış dökümünü inceleyip onaylayın ya da itiraz notu yazın.
                    </p>
                    {!showRejectBox ? (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button type="button" className="btn btn-primary" onClick={handleApproveDeal} disabled={approvalSaving}>
                          {approvalSaving ? 'Onaylanıyor…' : '✓ Onayla'}
                        </button>
                        <button type="button" className="btn btn-secondary" onClick={() => setShowRejectBox(true)} disabled={approvalSaving}>
                          ✗ İtiraz Notu Yaz
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <input
                          value={rejectNote}
                          onChange={(e) => setRejectNote(e.target.value)}
                          placeholder="İtiraz sebebinizi yazın…"
                          style={{ flex: 1, minWidth: 200 }}
                        />
                        <button type="button" className="btn btn-primary" onClick={handleSendRejectNote} disabled={approvalSaving || !rejectNote.trim()}>
                          Gönder
                        </button>
                        <button type="button" className="btn btn-secondary" onClick={() => setShowRejectBox(false)} disabled={approvalSaving}>
                          İptal
                        </button>
                      </div>
                    )}
                  </div>
                )}
                {tx.collaboratorAgentId && (
                  <div style={{ background: tx.splitFinalizedAt ? '#e6f4ea' : '#fdf3e0', borderRadius: 6, padding: '10px 12px', marginBottom: 14, fontSize: 12.5 }}>
                    🤝 Bu işlem <strong>işbirlikli</strong> — komisyon otomatik olarak{' '}
                    <strong>{agentNameFor(tx.agentId)} (%{tx.commissionSplitPercentage ?? 50})</strong> ve{' '}
                    <strong>{agentNameFor(tx.collaboratorAgentId)} (%{100 - (tx.commissionSplitPercentage ?? 50)})</strong> arasında bölünecek.
                    {!tx.splitFinalizedAt && ' ⚠️ Paylaşım henüz iki taraftan da onaylanmadı — komisyon kaydı yine de oluşturulur, ama pay oranı bu son onaylı haline göre hesaplanır.'}
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
                    <label>
                      Danışman Payı (TL)
                      {!agentShareTouched && agentSharePercent != null && (
                        <span style={{ fontWeight: 400, color: 'var(--muted)', fontSize: 10.5 }}> · %{agentSharePercent} oranından otomatik</span>
                      )}
                    </label>
                    <input type="number" value={agentCommission} onChange={(e) => handleAgentCommissionChange(e.target.value)} placeholder="0.00" />
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

            {activeTab === 'collab' && (
              <div>
                <h4 style={{ marginTop: 0 }}>🤝 İşbirlikli Satış</h4>
                <p>Müşteri & Portföy sahibi farklı danışmanlardır. İşbirlikli satış aktiftir.</p>
                <input type="number" value={splitDraft} onChange={(e) => setSplitDraft(e.target.value)} style={{ width: 80 }} /> % Pay
                <button type="button" className="btn btn-secondary" onClick={handleUpdateSplit} disabled={splitSaving} style={{ marginLeft: 8 }}>Güncelle</button>
                <button type="button" className="btn btn-primary" onClick={handleApproveSplit} disabled={splitSaving} style={{ marginLeft: 8 }}>Onayla</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
