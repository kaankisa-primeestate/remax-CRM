import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Landmark } from 'lucide-react';
import { expensesApi } from '../api/expenses';
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
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [period, setPeriod] = useState(searchParams.get('period') || 'month');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryLabel, setCategoryLabel] = useState('');

  useEffect(() => {
    if (categoryId === 'uncategorized') {
      setCategoryLabel('Kategorisiz');
      return;
    }
    expensesApi.listCategories().then((cats) => {
      setCategoryLabel(cats.find((c) => c.id === categoryId)?.name || 'Kategori');
    }).catch(() => setCategoryLabel('Kategori'));
  }, [categoryId]);

  const load = useCallback(async () => {
    setLoading(true);
    const { from, to } = periodRange(period);
    const data = await expensesApi.getCategoryDetail(categoryId, from, to).catch(() => []);
    setItems(data);
    setLoading(false);
  }, [categoryId, period]);

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
        style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--cl-muted)', background: 'transparent', border: 'none', padding: 0, marginBottom: 12, cursor: 'pointer', display: 'block' }}
      >
        ← Geri Dön
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
        <div>
          <h2 className="dossier__name" style={{ margin: 0 }}>{categoryLabel}</h2>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--cl-muted)' }}>{items.length} kalem · Toplam {formatMoney(total)}</p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {PERIODS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setPeriod(p.value)}
              style={{
                fontSize: 12, fontFamily: 'var(--font-body)', padding: '5px 12px', borderRadius: 999,
                border: '1px solid var(--cl-border)', cursor: 'pointer',
                background: period === p.value ? 'var(--cl-primary-800)' : 'transparent',
                color: period === p.value ? 'white' : 'var(--cl-muted)',
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
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--cl-border)', paddingBottom: 6, marginBottom: 8 }}>
                  <h4 style={{ margin: 0, fontSize: 14 }}>{monthLabel}</h4>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600 }}>{formatMoney(monthTotal)}</span>
                </div>
                {monthItems.map((item) => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--cl-border)' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{item.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--cl-muted)', display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                        <span>{new Date(item.date).toLocaleDateString('tr-TR')}</span>
                        {item.bankAccountName ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>· <Landmark size={11} /> {item.bankAccountName}</span>
                        ) : (
                          <span>· Hesap belirtilmedi</span>
                        )}
                        {item.notes && <span>· {item.notes}</span>}
                      </div>
                    </div>
                    <div style={{ fontFamily: 'var(--font-body)', fontWeight: 600 }}>{formatMoney(item.amount)}</div>
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
