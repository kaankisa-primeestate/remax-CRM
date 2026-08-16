import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { transactionsApi, TRANSACTION_STAGES } from '../api/transactions';
import { customersApi, CUSTOMER_TYPES } from '../api/customers';
import { propertiesApi } from '../api/properties';

const money = (n) =>
  n ? new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(n) : null;

// Islemler: belirli bir musteri + portfoy eslesmesinin somut anlasma
// surecini takip eden Kanban panosu (Gorusme -> Teklif -> Sozlesme -> Tapu).
// Musteri Kanban'indaki (pipelineStage) genel ilgi durumundan farkli --
// burasi SOMUT bir anlasmanin asamasini gosterir.
export default function TransactionsPage() {
  const [transactions, setTransactions] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);

  const [customerId, setCustomerId] = useState('');
  const [propertyId, setPropertyId] = useState('');
  const [offerAmount, setOfferAmount] = useState('');
  const [saving, setSaving] = useState(false);

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

  async function handleAdd(e) {
    e.preventDefault();
    if (!customerId || !propertyId) return;
    setSaving(true);
    try {
      await transactionsApi.create({
        customerId,
        propertyId,
        offerAmount: offerAmount ? Number(offerAmount) : undefined,
      });
      setCustomerId('');
      setPropertyId('');
      setOfferAmount('');
      load();
    } catch (err) {
      alert('İşlem oluşturulamadı, tekrar deneyin.');
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

  return (
    <div>
      <h2 className="dossier__name" style={{ marginBottom: 16 }}>İşlemler</h2>

      <div className="folder-panel" style={{ marginBottom: 20 }}>
        <h3 style={{ fontFamily: 'var(--font-display)', marginTop: 0, fontSize: 16 }}>Yeni İşlem Başlat</h3>
        <form onSubmit={handleAdd} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-field" style={{ margin: 0, minWidth: 180 }}>
            <label>Müşteri</label>
            <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} required>
              <option value="">Seçiniz</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
              ))}
            </select>
          </div>
          <div className="form-field" style={{ margin: 0, minWidth: 180 }}>
            <label>Portföy</label>
            <select value={propertyId} onChange={(e) => setPropertyId(e.target.value)} required>
              <option value="">Seçiniz</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          </div>
          <div className="form-field" style={{ margin: 0 }}>
            <label>Teklif Tutarı (opsiyonel)</label>
            <input type="number" min="0" value={offerAmount} onChange={(e) => setOfferAmount(e.target.value)} placeholder="₺" />
          </div>
          <button type="submit" className="btn btn-primary" disabled={saving || !customerId || !propertyId}>
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
                          <div className="transaction-card__title">
                            {property ? (
                              <Link to={`/portfoyler/${property.id}`}>{property.title}</Link>
                            ) : 'Portföy silinmiş'}
                          </div>
                          <div className="transaction-card__meta">
                            {customer ? (
                              <Link to={`/musteriler/${customer.id}`}>
                                {customer.firstName} {customer.lastName}
                              </Link>
                            ) : 'Müşteri silinmiş'}
                            {customer && ` · ${CUSTOMER_TYPES.find((ct) => ct.value === customer.type)?.label}`}
                          </div>
                          {t.offerAmount && (
                            <div className="transaction-card__offer">{money(t.offerAmount)}</div>
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
