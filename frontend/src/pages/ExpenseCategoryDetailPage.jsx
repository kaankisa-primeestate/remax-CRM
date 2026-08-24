import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { expensesApi, EXPENSE_CATEGORIES } from '../api/expenses';
import { formatMoney } from '../api/bankAccounts';

const PERIODS = [
  { value: 'month', label: 'Bu Ay' },
  { value: 'week', label: 'Bu Hafta' },
  { value: 'year', label: 'Bu Yıl' },
];

function periodRange(period) {
  const now = new Date();
  const to = now.toISOString().slice(0, 10);
  let fromDate;
  if (period === 'week') {
    fromDate = new Date(now);
    const day = fromDate.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    fromDate.setDate(fromDate.getDate() + diff);
  } else if (period === 'year') {
    fromDate = new Date(now.getFullYear(), 0, 1);
  } else {
    fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
  }
  return { from: fromDate.toISOString().slice(0, 10), to };
}

export default function ExpenseCategoryDetailPage() {
  const { category } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [period, setPeriod] = useState(searchParams.get('period') || 'month');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const categoryLabel = EXPENSE_CATEGORIES.find((c) => c.value === category)?.label || category;

  const load = useCallback(async () => {
    setLoading(true);
    const { from, to } = periodRange(period);
    const data = await expensesApi.getCategoryDetail(category, from, to).catch(() => []);
    setItems(data);
    setLoading(false);
  }, [category, period]);

  useEffect(() => {
    load();
  }, [load]);

  const total = items.reduce((sum, i) => sum + i.amount, 0);

  const byMonth = items.reduce((acc, item) => {
    const monthKey = item.date.slice(0, 7);
    if (!acc[monthKey]) acc[monthKey] = [];
    acc[monthKey].push(item);
    return acc;
  }, {});
  const monthKeys = Object.keys(byMonth).sort().reverse();

  return (
    <div>
      <button
        type="button"
        onClick={() => navigate(-1)}
        style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--muted)', background: 'transparent', border: 'none', padding: 0, marginBottom: 12, cursor: 'pointer', display: 'block' }}
      >
        ← Geri Dön
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
        <div>
          <h2 className="dossier__name" style={{ margin: 0 }}>{categoryLabel}</h2>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--muted)' }}>{items.length} kalem · Toplam {formatMoney(total)}</p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {PERIODS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setPeriod(p.value)}
              style={{
                fontSize: 12, fontFamily: 'var(--font-mono)', padding: '5px 12px', borderRadius: 999,
                border: '1px solid var(--paper-line)', cursor: 'pointer',
                background: period === p.value ? 'var(--ink-navy)' : 'transparent',
                color: period === p.value ? 'white' : 'var(--muted)',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="folder-panel">
        {loading ? (
          <div className="empty-state">Yükleniyor…</div>
        ) : items.length === 0 ? (
          <div className="empty-state">Bu dönemde bu kategoride bir harcama yok.</div>
        ) : (
          monthKeys.map((monthKey) => {
            const monthItems = byMonth[monthKey];
            const monthTotal = monthItems.reduce((sum, i) => sum + i.amount, 0);
            const monthLabel = new Date(`${monthKey}-01`).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
            return (
              <div key={monthKey} style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--paper-line)', paddingBottom: 6, marginBottom: 8 }}>
                  <h4 style={{ margin: 0, fontSize: 14 }}>{monthLabel}</h4>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600 }}>{formatMoney(monthTotal)}</span>
                </div>
                {monthItems.map((item) => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{item.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                        {new Date(item.date).toLocaleDateString('tr-TR')}
                        {item.bankAccountName && ` · 🏦 ${item.bankAccountName}`}
                        {!item.bankAccountName && ' · Hesap belirtilmedi'}
                        {item.notes && ` · ${item.notes}`}
                      </div>
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{formatMoney(item.amount)}</div>
                  </div>
                ))}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
