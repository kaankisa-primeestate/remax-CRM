import { useEffect, useState, useCallback } from 'react';
import { chequeNotesApi, CHEQUE_NOTE_TYPES, CHEQUE_NOTE_DIRECTIONS, CHEQUE_NOTE_STATUSES } from '../../api/chequeNotes';
import { bankAccountsApi, formatMoney } from '../../api/bankAccounts';

const WARNING_DAYS = 3; // vade tarihine bu kadar gun kala uyari gosterilir

function daysUntil(dateStr) {
  const today = new Date(new Date().toISOString().slice(0, 10));
  const due = new Date(dateStr);
  return Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export default function ChequeNotesTab() {
  const [items, setItems] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [type, setType] = useState('cheque');
  const [direction, setDirection] = useState('receivable');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [drawerName, setDrawerName] = useState('');
  const [referenceNo, setReferenceNo] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const [collectingId, setCollectingId] = useState(null);
  const [collectBankAccountId, setCollectBankAccountId] = useState('');
  const [collectSaving, setCollectSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [itemData, accData] = await Promise.all([
      chequeNotesApi.list(),
      bankAccountsApi.list().catch(() => []),
    ]);
    setItems(itemData);
    setAccounts(accData);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function resetForm() {
    setType('cheque');
    setDirection('receivable');
    setAmount('');
    setDueDate('');
    setDrawerName('');
    setReferenceNo('');
    setNotes('');
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (!amount || Number(amount) <= 0 || !dueDate || !drawerName.trim()) return;
    setSaving(true);
    try {
      await chequeNotesApi.create({
        type,
        direction,
        amount: Number(amount),
        dueDate,
        drawerName: drawerName.trim(),
        referenceNo: referenceNo.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      resetForm();
      load();
    } catch {
      alert('Kayıt eklenemedi, tekrar deneyin.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Bu çek/senet kaydı silinsin mi?')) return;
    try {
      await chequeNotesApi.remove(id);
      load();
    } catch {
      alert('Silinemedi, tekrar deneyin.');
    }
  }

  async function handleQuickStatus(id, status) {
    try {
      await chequeNotesApi.update(id, { status });
      load();
    } catch {
      alert('Durum güncellenemedi, tekrar deneyin.');
    }
  }

  function openCollectForm(item) {
    setCollectingId(item.id);
    setCollectBankAccountId(item.bankAccountId || '');
  }

  async function handleCollect(id) {
    setCollectSaving(true);
    try {
      await chequeNotesApi.update(id, {
        status: 'collected',
        bankAccountId: collectBankAccountId || undefined,
      });
      setCollectingId(null);
      load();
    } catch {
      alert('İşlem başarısız, tekrar deneyin.');
    } finally {
      setCollectSaving(false);
    }
  }

  return (
    <>
      <div className="folder-panel" style={{ marginBottom: 20 }}>
        <h3 style={{ fontFamily: 'var(--font-display)', marginTop: 0, fontSize: 16 }}>Yeni Çek / Senet Ekle</h3>
        <form onSubmit={handleAdd} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-field" style={{ margin: 0 }}>
            <label>Tür</label>
            <select value={type} onChange={(e) => setType(e.target.value)}>
              {CHEQUE_NOTE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="form-field" style={{ margin: 0, minWidth: 180 }}>
            <label>Yön</label>
            <select value={direction} onChange={(e) => setDirection(e.target.value)}>
              {CHEQUE_NOTE_DIRECTIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
          </div>
          <div className="form-field" style={{ margin: 0 }}>
            <label>Tutar</label>
            <input type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="form-field" style={{ margin: 0 }}>
            <label>Vade Tarihi</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <div className="form-field" style={{ margin: 0, minWidth: 160 }}>
            <label>Keşideci</label>
            <input value={drawerName} onChange={(e) => setDrawerName(e.target.value)} placeholder="Örn: Ahmet Yılmaz" />
          </div>
          <div className="form-field" style={{ margin: 0, minWidth: 120 }}>
            <label>Çek/Senet No (opsiyonel)</label>
            <input value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} />
          </div>
          <div className="form-field full">
            <label>Not (opsiyonel)</label>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <button type="submit" className="btn btn-primary" disabled={saving || !amount || !dueDate || !drawerName.trim()}>
            {saving ? 'Ekleniyor…' : '+ Ekle'}
          </button>
        </form>
      </div>

      <div className="folder-panel">
        {loading ? (
          <div className="empty-state">Yükleniyor…</div>
        ) : items.length === 0 ? (
          <div className="empty-state">Henüz çek/senet kaydı eklenmemiş.</div>
        ) : (
          items.map((item) => {
            const days = daysUntil(item.dueDate);
            const isPending = item.status === 'portfolio';
            const isNearDue = isPending && days <= WARNING_DAYS && days >= 0;
            const isOverdue = isPending && days < 0;
            return (
              <div
                key={item.id}
                className="ledger-history-item"
                style={{
                  flexWrap: 'wrap',
                  background: isOverdue ? '#fbeeeb' : isNearDue ? '#fdf3e0' : undefined,
                  opacity: item.status === 'portfolio' ? 1 : 0.7,
                }}
              >
                <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--muted)', minWidth: 40 }}>
                  {CHEQUE_NOTE_TYPES.find((t) => t.value === item.type)?.label}
                </span>
                <span style={{ flex: 1, minWidth: 140 }}>
                  {item.drawerName}
                  {item.referenceNo && <span style={{ color: 'var(--muted)', fontSize: 11 }}> · {item.referenceNo}</span>}
                </span>
                <span style={{ fontSize: 12, color: item.direction === 'receivable' ? 'var(--success)' : 'var(--danger)' }}>
                  {item.direction === 'receivable' ? '↑ Alacak' : '↓ Borç'}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>{formatMoney(item.amount)}</span>
                <span style={{ fontSize: 12, color: isOverdue ? 'var(--danger)' : isNearDue ? '#8a6100' : 'var(--muted)' }}>
                  {(isOverdue || isNearDue) && '⚠ '}
                  {new Date(item.dueDate).toLocaleDateString('tr-TR')}
                  {isPending && isOverdue && ' (gecikti)'}
                  {isPending && isNearDue && ` (${days} gün kaldı)`}
                </span>
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                  {CHEQUE_NOTE_STATUSES.find((s) => s.value === item.status)?.label}
                </span>

                {isPending && (
                  collectingId === item.id ? (
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', width: '100%', marginTop: 6 }}>
                      <select value={collectBankAccountId} onChange={(e) => setCollectBankAccountId(e.target.value)}>
                        <option value="">Banka seçilmedi</option>
                        {accounts.map((acc) => (
                          <option key={acc.id} value={acc.id}>{acc.bankName} — {acc.accountName}</option>
                        ))}
                      </select>
                      <button type="button" className="btn btn-primary" style={{ fontSize: 11, padding: '4px 10px' }} disabled={collectSaving} onClick={() => handleCollect(item.id)}>
                        {collectSaving ? '…' : 'Onayla'}
                      </button>
                      <button type="button" className="btn btn-secondary" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => setCollectingId(null)}>
                        İptal
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button type="button" className="btn btn-primary" style={{ fontSize: 11, padding: '4px 8px' }} onClick={() => openCollectForm(item)}>
                        Tahsil/Öde
                      </button>
                      <button type="button" className="btn btn-secondary" style={{ fontSize: 11, padding: '4px 8px' }} onClick={() => handleQuickStatus(item.id, 'bounced')}>
                        Karşılıksız
                      </button>
                    </div>
                  )
                )}
                <button type="button" className="task-row__delete" onClick={() => handleDelete(item.id)} title="Sil">✕</button>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}
