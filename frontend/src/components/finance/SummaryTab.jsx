import { useEffect, useState, useCallback } from 'react';
import { bankAccountsApi, formatMoney } from '../../api/bankAccounts';
import { expensesApi } from '../../api/expenses';

const SOURCE_LABELS = {
  partner_ledger: 'Ortak Sermayesi / Avans Girişi',
  agent_due: 'Danışman Aidat Tahsilatı',
  cheque_note: 'Çek / Senet Tahsilatı',
  manual: 'Manuel Kasa Girişi',
  commission: 'Komisyon Ofis Payı Tahsilatı',
};

export default function SummaryTab() {
  const [period, setPeriod] = useState('month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const [summary, setSummary] = useState(null);
  const [expenseSummary, setExpenseSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  const getDateRange = useCallback(() => {
    const now = new Date();
    let from = new Date();
    let to = new Date();

    if (period === 'week') {
      const day = now.getDay() || 7;
      from.setDate(now.getDate() - day + 1);
    } else if (period === 'month') {
      from = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (period === 'year') {
      from = new Date(now.getFullYear(), 0, 1);
    } else if (period === 'custom' && customFrom && customTo) {
      from = new Date(customFrom);
      to = new Date(customTo);
    }

    return {
      fromStr: from.toISOString().slice(0, 10),
      toStr: to.toISOString().slice(0, 10),
    };
  }, [period, customFrom, customTo]);

  const loadData = useCallback(async () => {
    setLoading(true);
    const { fromStr, toStr } = getDateRange();
    try {
      const [finRes, expRes] = await Promise.all([
        bankAccountsApi.getFinanceSummary(fromStr, toStr).catch(() => null),
        expensesApi.getSummary(fromStr, toStr).catch(() => null),
      ]);
      setSummary(finRes);
      setExpenseSummary(expRes);
    } catch {
      // sessiz geç
    } finally {
      setLoading(false);
    }
  }, [getDateRange]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div>
      <div className="folder-panel" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontWeight: 'bold', fontSize: 13 }}>Tarih Aralığı:</span>
          <button
            type="button"
            className={`btn ${period === 'week' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: 12, padding: '4px 10px' }}
            onClick={() => setPeriod('week')}
          >
            Bu Hafta
          </button>
          <button
            type="button"
            className={`btn ${period === 'month' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: 12, padding: '4px 10px' }}
            onClick={() => setPeriod('month')}
          >
            Bu Ay
          </button>
          <button
            type="button"
            className={`btn ${period === 'year' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: 12, padding: '4px 10px' }}
            onClick={() => setPeriod('year')}
          >
            Bu Yıl
          </button>

          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginLeft: 10 }}>
            <input
              type="date"
              value={customFrom}
              onChange={(e) => {
                setCustomFrom(e.target.value);
                setPeriod('custom');
              }}
              style={{ fontSize: 12, padding: '3px 6px' }}
            />
            <span style={{ fontSize: 12 }}>—</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => {
                setCustomTo(e.target.value);
                setPeriod('custom');
              }}
              style={{ fontSize: 12, padding: '3px 6px' }}
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="empty-state">Özet rapor hazırlanıyor…</div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 20 }}>
            <div className="folder-panel" style={{ borderLeft: '4px solid var(--success)' }}>
              <div style={{ fontSize: 12, color: 'var(--muted)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
                💰 Toplam Kasaya Giren Para
              </div>
              <div style={{ fontSize: 22, fontWeight: 'bold', fontFamily: 'var(--font-mono)', marginTop: 4, color: 'var(--success)' }}>
                {formatMoney(summary?.totalIncome || 0)}
              </div>
            </div>

            <div className="folder-panel" style={{ borderLeft: '4px solid var(--danger)' }}>
              <div style={{ fontSize: 12, color: 'var(--muted)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
                🧾 Toplam Kasadan Çıkan Para
              </div>
              <div style={{ fontSize: 22, fontWeight: 'bold', fontFamily: 'var(--font-mono)', marginTop: 4, color: 'var(--danger)' }}>
                {formatMoney(summary?.totalExpense || 0)}
              </div>
            </div>

            <div className="folder-panel" style={{ borderLeft: `4px solid ${(summary?.netBalance || 0) >= 0 ? '#2563eb' : 'var(--danger)'}` }}>
              <div style={{ fontSize: 12, color: 'var(--muted)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
                📊 Dönem İçi Net Bakiye Değişimi
              </div>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 'bold',
                  fontFamily: 'var(--font-mono)',
                  marginTop: 4,
                  color: (summary?.netBalance || 0) >= 0 ? '#2563eb' : 'var(--danger)',
                }}
              >
                {formatMoney(summary?.netBalance || 0)}
              </div>
            </div>
          </div>

          <div className="folder-panel" style={{ marginBottom: 20, background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: 8 }}>
            <p style={{ margin: 0, fontSize: 12, color: '#b45309' }}>
              💡 <strong>Not:</strong> Komisyon kayıtlarındaki "Ofis Payı" tahsilatı henüz doğrudan kasa/banka girişine otomatik bağlanmadığı için bu rapordaki giren tutara sadece kasaya fiziken işlenen tahsilatlar dahildir.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
            <div className="folder-panel">
              <h3 style={{ fontFamily: 'var(--font-display)', marginTop: 0, fontSize: 15, color: 'var(--success)' }}>
                📥 Şirkete Giren Para Kaynakları
              </h3>
              {!summary?.incomeBySource || Object.keys(summary.incomeBySource).length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>Bu dönemde kasaya giriş kaydı yok.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
                  {Object.entries(summary.incomeBySource).map(([src, amt]) => (
                    <div key={src} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', background: '#f8fafc', borderRadius: 6, fontSize: 13 }}>
                      <span>{SOURCE_LABELS[src] || src}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 'bold', color: 'var(--success)' }}>
                        +{formatMoney(amt)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="folder-panel">
              <h3 style={{ fontFamily: 'var(--font-display)', marginTop: 0, fontSize: 15, color: 'var(--danger)' }}>
                📤 Yapılan Masraf ve Çıkış Ödemeleri
              </h3>
              {!expenseSummary?.byCategory || expenseSummary.byCategory.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>Bu dönemde masraf/çıkış kaydı yok.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
                  {expenseSummary.byCategory.map((item) => (
                    <div key={item.category} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', background: '#f8fafc', borderRadius: 6, fontSize: 13 }}>
                      <span>{item.categoryLabel || item.category}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 'bold', color: 'var(--danger)' }}>
                        -{formatMoney(item.total)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
