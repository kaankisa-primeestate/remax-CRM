import { useEffect, useState, useCallback } from 'react';
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
      <h3 style={{ fontFamily: 'var(--font-display)', marginTop: 0, fontSize: 16 }}>
        📑 Çek/Senet Takibi {pendingCount > 0 && <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 400 }}>({pendingCount} bekliyor)</span>}
      </h3>
      <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: -6, marginBottom: 16 }}>
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
                background: isOverdue ? '#fbeeeb' : isNearDue ? '#fdf3e0' : undefined,
                opacity: item.status === 'portfolio' ? 1 : 0.7,
              }}
            >
              <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--muted)', minWidth: 40 }}>
                {CHEQUE_NOTE_TYPES.find((t) => t.value === item.type)?.label}
              </span>
              <span style={{ flex: 1, minWidth: 160 }}>
                {item.drawerName}
                {item.referenceNo && <span style={{ color: 'var(--muted)', fontSize: 11 }}> · {item.referenceNo}</span>}
                {item.notes && <div style={{ fontSize: 11, color: 'var(--muted)' }}>{item.notes}</div>}
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
