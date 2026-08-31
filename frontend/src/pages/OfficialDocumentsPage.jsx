import { useEffect, useState } from 'react';
import { propertyDocumentsApi, ITEM_TYPE_LABELS } from '../api/propertyDocuments';
import { useNavigate } from 'react-router-dom';

export default function OfficialDocumentsPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [missingType, setMissingType] = useState('');
  const [onlyIncomplete, setOnlyIncomplete] = useState(false);
  const navigate = useNavigate();

  const loadSummary = async () => {
    setLoading(true);
    try {
      const res = await propertyDocumentsApi.getOfficeSummary({
        missingType: missingType || undefined,
        onlyIncomplete,
      });
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSummary();
  }, [missingType, onlyIncomplete]);

  return (
    <div style={{ padding: 20 }}>
      <h2>📂 Resmi Evraklar Yönetimi (Broker Denetim Paneli)</h2>

      <div className="folder-panel" style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 20 }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 'bold' }}>Eksik Evrak Türü Filtresi: </label>
          <select value={missingType} onChange={(e) => setMissingType(e.target.value)} style={{ padding: 6 }}>
            <option value="">Tümü</option>
            {Object.entries(ITEM_TYPE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>

        <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
          <input type="checkbox" checked={onlyIncomplete} onChange={(e) => setOnlyIncomplete(e.target.checked)} />
          Sadece Evrakları Tamamlanmamış Portföyleri Göster
        </label>
      </div>

      <div className="folder-panel">
        {loading ? (
          <div>Yükleniyor…</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #cbd5e1', textAlign: 'left' }}>
                <th style={{ padding: 10 }}>Portföy</th>
                <th style={{ padding: 10 }}>Danışman</th>
                <th style={{ padding: 10 }}>Müşteri</th>
                <th style={{ padding: 10 }}>Tamamlanma</th>
                {Object.keys(ITEM_TYPE_LABELS).map((key) => (
                  <th key={key} style={{ padding: 10, textAlign: 'center', fontSize: 11 }}>{ITEM_TYPE_LABELS[key]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map(({ property, completionRate, items }) => (
                <tr
                  key={property.id}
                  onClick={() => navigate(`/properties/${property.id}`)}
                  style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}
                >
                  <td style={{ padding: 10, fontWeight: 'bold' }}>{property.title}</td>
                  <td style={{ padding: 10 }}>{property.agentName || '—'}</td>
                  <td style={{ padding: 10 }}>{property.clientName || '—'}</td>
                  <td style={{ padding: 10, fontWeight: 'bold' }}>%{completionRate}</td>
                  {Object.keys(ITEM_TYPE_LABELS).map((key) => {
                    const item = items.find((i) => i.itemType === key);
                    return (
                      <td key={key} style={{ padding: 10, textAlign: 'center' }}>
                        {item?.status === 'done' ? '✅' : '❌'}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
