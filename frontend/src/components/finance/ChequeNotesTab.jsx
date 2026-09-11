import { useEffect, useState, useCallback } from 'react';
import { FileStack, ArrowUp, ArrowDown, AlertTriangle } from 'lucide-react';
import { chequeNotesApi, CHEQUE_NOTE_TYPES, CHEQUE_NOTE_STATUSES } from '../../api/chequeNotes';
import { bankAccountsApi, formatMoney } from '../../api/bankAccounts';

const WARNING_DAYS = 3; // vade tarihine bu kadar gun kala uyari gosterilir

function daysUntil(dateStr) {
  const today = new Date(new Date().toISOString().slice(0, 10));
  const due = new Date(dateStr);
  return Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

// Cek/Senet Takibi -- ARTIK bir giris ekrani DEGIL, SADECE goruntuleme
// ve durum guncelleme (tahsil/ode, karsiliksiz) amacli bir RAPOR.
// Kayitlar artik SADECE islem sirasinda (Gider odemesi, Komisyon odemesi,
// Banka Hareketi girisi -- "Odeme Yontemi: Cek/Senet" secildiginde)
// otomatik olusuyor, boylece her cek/senet DOGAL olarak bagli oldugu
// islemden doguyor, kopuk bir kayit olmuyor.
export default function ChequeNotesTab() {
  const [items, setItems] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const pendingCount = items.filter((i) => i.status === 'portfolio').length;

  return (
    <div className="folder-panel">
      <h3 style={{ fontFamily: 'var(--cl-font-heading)', marginTop: 0, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <FileStack size={17} /> Çek/Senet Takibi {pendingCount > 0 && <span style={{ fontSize: 12, color: 'var(--cl-muted)', fontWeight: 400 }}>({pendingCount} bekliyor)</span>}
      </h3>
      <p style={{ fontSize: 12, color: 'var(--cl-muted)', marginTop: -6, marginBottom: 16 }}>
        Kayıtlar otomatik oluşur — bir Gider, Komisyon Ödemesi veya Banka Hareketi girişinde "Ödeme Yöntemi: Çek/Senet" seçildiğinde burada görünür.
      </p>
      {loading ? (
        <div className="empty-state">Yükleniyor…</div>
      ) : items.length === 0 ? (
        <div className="empty-state">Henüz bir çek/senet kaydı yok.</div>
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
                background: isOverdue ? 'rgba(214, 69, 69, 0.06)' : isNearDue ? 'rgba(196, 154, 85, 0.1)' : undefined,
                opacity: item.status === 'portfolio' ? 1 : 0.7,
              }}
            >
              <span style={{ fontSize: 11, fontFamily: 'var(--font-body)', color: 'var(--cl-muted)', minWidth: 40 }}>
                {CHEQUE_NOTE_TYPES.find((t) => t.value === item.type)?.label}
              </span>
              <span style={{ flex: 1, minWidth: 160 }}>
                {item.drawerName}
                {item.referenceNo && <span style={{ color: 'var(--cl-muted)', fontSize: 11 }}> · {item.referenceNo}</span>}
                {item.notes && <div style={{ fontSize: 11, color: 'var(--cl-muted)' }}>{item.notes}</div>}
              </span>
              <span style={{ fontSize: 12, color: item.direction === 'receivable' ? 'var(--cl-success)' : 'var(--cl-danger)', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                {item.direction === 'receivable' ? (<><ArrowUp size={11} /> Alacak</>) : (<><ArrowDown size={11} /> Borç</>)}
              </span>
              <span style={{ fontFamily: 'var(--font-body)' }}>{formatMoney(item.amount)}</span>
              <span style={{ fontSize: 12, color: isOverdue ? 'var(--cl-danger)' : isNearDue ? '#8a6420' : 'var(--cl-muted)', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                {(isOverdue || isNearDue) && <AlertTriangle size={11} />}
                {new Date(item.dueDate).toLocaleDateString('tr-TR')}
                {isPending && isOverdue && ' (gecikti)'}
                {isPending && isNearDue && ` (${days} gün kaldı)`}
              </span>
              <span style={{ fontSize: 11, color: 'var(--cl-muted)' }}>
                {CHEQUE_NOTE_STATUSES.find((s) => s.value === item.status)?.label}
              </span>

              {isPending && (
                collectingId === item.id ? (
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', width: '100%', marginTop: 6 }}>
                    <select value={collectBankAccountId} onChange={(e) => setCollectBankAccountId(e.target.value)}>
                      <option value="">Hesap seçilmedi</option>
                      {accounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>{acc.bankName ? `${acc.bankName} — ${acc.accountName}` : acc.accountName}</option>
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
                      {item.direction === 'receivable' ? 'Tahsil Et' : 'Öde'}
                    </button>
                    <button type="button" className="btn btn-secondary" style={{ fontSize: 11, padding: '4px 8px' }} onClick={() => handleQuickStatus(item.id, 'bounced')}>
                      Karşılıksız
                    </button>
                  </div>
                )
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
