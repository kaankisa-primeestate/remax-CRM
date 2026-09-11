import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, X } from 'lucide-react';
import { valuationsApi, PROPERTY_TYPE_LABELS } from '../api/valuations';

const money = (n) => (n != null ? new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(n) : '—');

const STATUS_LABELS = {
  draft: { label: 'Taslak', color: '#8a6420', bg: 'rgba(196, 154, 85, 0.15)' },
  completed: { label: 'Tamamlandı', color: 'var(--cl-success)', bg: 'rgba(21, 154, 99, 0.12)' },
};

export default function ValuationsListPage() {
  const navigate = useNavigate();
  const [valuations, setValuations] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const list = await valuationsApi.list().catch(() => []);
    setValuations(list);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete(e, id) {
    e.stopPropagation();
    if (!confirm('Bu analiz silinsin mi?')) return;
    setValuations((prev) => prev.filter((v) => v.id !== id));
    try {
      await valuationsApi.remove(id);
    } catch {
      load();
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 className="dossier__name" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <BarChart3 size={20} style={{ color: 'var(--cl-gold)' }} /> Piyasa Değer Analizleri
        </h2>
        <button type="button" className="btn btn-primary" onClick={() => navigate('/degerleme/yeni')}>
          + Yeni Analiz
        </button>
      </div>

      <div className="folder-panel">
        {loading ? (
          <div className="empty-state">Yükleniyor…</div>
        ) : valuations.length === 0 ? (
          <div className="empty-state">
            Henüz bir değer analizi oluşturmadınız. Bir müşteriye "kaç paraya satsam?" sorusuna profesyonel bir cevap
            hazırlamak için "+ Yeni Analiz"e tıklayın.
          </div>
        ) : (
          valuations.map((v) => {
            const statusInfo = STATUS_LABELS[v.status] || STATUS_LABELS.draft;
            return (
              <div
                key={v.id}
                className="record-row"
                style={{ cursor: 'pointer', flexWrap: 'wrap', gap: 8 }}
                onClick={() => navigate(`/degerleme/${v.id}`)}
              >
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div className="record-row__name">{v.subjectTitle}</div>
                  <div style={{ fontSize: 12, color: 'var(--cl-muted)' }}>
                    {PROPERTY_TYPE_LABELS[v.propertyType] || v.propertyType} · {v.subjectDistrict}, {v.subjectProvince}
                    {v.subjectAreaM2 ? ` · ${v.subjectAreaM2} m²` : ''}
                  </div>
                </div>
                {v.estimatedValueTarget && (
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600 }}>{money(v.estimatedValueTarget)}</div>
                )}
                <span style={{ fontSize: 11, fontFamily: 'var(--font-body)', background: statusInfo.bg, color: statusInfo.color, borderRadius: 999, padding: '3px 10px' }}>
                  {statusInfo.label}
                </span>
                <button type="button" className="task-row__delete" onClick={(e) => handleDelete(e, v.id)} title="Sil"><X size={13} /></button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
