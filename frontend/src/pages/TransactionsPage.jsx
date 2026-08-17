import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { transactionsApi, TRANSACTION_STAGES } from '../api/transactions';
import { customersApi, CUSTOMER_TYPES } from '../api/customers';
import { propertiesApi } from '../api/properties';
import { useAuth } from '../context/AuthContext.jsx';

const money = (n) =>
  n ? new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(n) : null;

const DETAIL_TABS = [
  { key: 'summary', label: '📋 Özet' },
  { key: 'financial', label: '💰 Finansal' },
  { key: 'docs', label: '📁 Belgeler' },
  { key: 'timeline', label: '🕐 Zaman Akışı' },
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

  const [customerMode, setCustomerMode] = useState('system'); // 'system' | 'external'
  const [customerId, setCustomerId] = useState('');
  const [externalCustomerLabel, setExternalCustomerLabel] = useState('');
  const [propertyMode, setPropertyMode] = useState('system');
  const [propertyId, setPropertyId] = useState('');
  const [externalPropertyLabel, setExternalPropertyLabel] = useState('');
  const [offerAmount, setOfferAmount] = useState('');
  const [saving, setSaving] = useState(false);

  const [detailTx, setDetailTx] = useState(null);
  const [activeDetailTab, setActiveDetailTab] = useState('summary');
  const [notes, setNotes] = useState([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositDate, setDepositDate] = useState('');
  const [savingDeposit, setSavingDeposit] = useState(false);

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
    setNotes([]);
    setNotesLoading(true);
    try {
      const list = await transactionsApi.getNotes(t.id);
      setNotes(list);
    } catch {
      setNotes([]);
    } finally {
      setNotesLoading(false);
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
              return (
                <div className="kanban-column" key={stage.value}>
                  <div className="kanban-column__title">{stage.label} ({stageTransactions.length})</div>
                  {stageTransactions.length === 0 ? (
                    <div className="kanban-empty">Bu aşamada işlem yok</div>
                  ) : (
                    stageTransactions.map((t) => {
                      const customer = customers.find((c) => c.id === t.customerId);
                      const property = properties.find((p) => p.id === t.propertyId);
                      return (
                        <div key={t.id} className="transaction-card">
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
                <div className="finance-placeholder" style={{ margin: '0 auto' }}>
                  <div className="finance-placeholder__icon">📁</div>
                  <div className="finance-placeholder__title">Belgeler</div>
                  <p className="finance-placeholder__text">
                    Bu bölüm sırada: Yer Gösterme Formu, Sözleşme, Tapu, Kimlik gibi belgelerin kontrol listesi ve dosya yükleme burada olacak.
                  </p>
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
