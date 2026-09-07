import { useState, useEffect } from 'react';

// Örnek Seçim Listeleri (Backend veriniz bağlandığında dinamikleşir)
const EXPENSE_CATEGORIES = [
  { id: 'ALL', name: 'Tüm Giderler' },
  { id: 'RENT', name: 'Ofis Kirası & Aidat' },
  { id: 'MARKETING', name: 'Pazarlama & İlan Portalları' },
  { id: 'BILLS', name: 'Faturalar (Elektrik/Su/Net)' },
  { id: 'OFFICE_SUPPLIES', name: 'Mutfak & Ofis Giderleri' },
];

const AGENTS_LIST = [
  { id: 'ALL', name: 'Tüm Danışmanlar (Ofis Geneli)' },
  { id: 'AGENT_1', name: 'Ahmet Yılmaz' },
  { id: 'AGENT_2', name: 'Ayşe Kaya' },
  { id: 'AGENT_3', name: 'Kaan Kısa' },
  { id: 'AGENT_4', name: 'Mehmet Demir' },
];

const PARTNERS_LIST = [
  { id: 'ALL', name: 'Tüm Ortaklar' },
  { id: 'PARTNER_1', name: 'Kaan Kısa' },
  { id: 'PARTNER_2', name: 'Alper Sarıalp' },
];

export default function ReportsPage() {
  const [reportType, setReportType] = useState('EXPENSES'); // EXPENSES, COMMISSION, FEES, PARTNERS, GENERAL
  const [subFilter, setSubFilter] = useState('ALL');
  const [dateRange, setDateRange] = useState('THIS_MONTH');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // 1. Kutu (Rapor Türü) değiştiğinde 2. Kutudaki seçimi sıfırla
  useEffect(() => {
    setSubFilter('ALL');
    setSearchTerm('');
  }, [reportType]);

  const handleFetchReport = (e) => {
    e.preventDefault();
    console.log('Rapor çağrılıyor:', {
      reportType,
      subFilter,
      dateRange,
      customStartDate,
      customEndDate,
    });
    // Mevcut rapor getirme API çağrınız buraya bağlanır
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>📊 Finansal Raporlar</h2>

      {/* 3 KUTU + GETİR BUTONU PANENİ */}
      <div className="folder-panel" style={{ background: '#f8fafc', padding: 16, marginBottom: 20 }}>
        <form onSubmit={handleFetchReport} style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          
          {/* 1. KUTU: RAPOR TÜRÜ */}
          <div style={{ flex: '1 1 200px' }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 'bold', marginBottom: 4 }}>
              1. Rapor Türü
            </label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }}
            >
              <option value="EXPENSES">Gider Raporları</option>
              <option value="COMMISSION">Komisyon Gelirleri</option>
              <option value="FEES">Ofis Aidat Gelirleri</option>
              <option value="PARTNERS">Ortaklar Cari</option>
              <option value="GENERAL">Genel Rapor</option>
            </select>
          </div>

          {/* 2. KUTU: DİNAMİK ALT SEÇİM / ARA */}
          <div style={{ flex: '1 1 240px' }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 'bold', marginBottom: 4 }}>
              2. Alt Seçim / Filtre
            </label>

            {reportType === 'GENERAL' ? (
              <input
                type="text"
                disabled
                value="Tüm Ofis İcmali"
                style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#e2e8f0' }}
              />
            ) : (
              <select
                value={subFilter}
                onChange={(e) => setSubFilter(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }}
              >
                {reportType === 'EXPENSES' &&
                  EXPENSE_CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}

                {(reportType === 'COMMISSION' || reportType === 'FEES') &&
                  AGENTS_LIST.map((agent) => (
                    <option key={agent.id} value={agent.id}>{agent.name}</option>
                  ))}

                {reportType === 'PARTNERS' &&
                  PARTNERS_LIST.map((partner) => (
                    <option key={partner.id} value={partner.id}>{partner.name}</option>
                  ))}
              </select>
            )}
          </div>

          {/* 3. KUTU: TARİH ARALIĞI */}
          <div style={{ flex: '1 1 180px' }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 'bold', marginBottom: 4 }}>
              3. Tarih Aralığı
            </label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }}
            >
              <option value="THIS_MONTH">Bu Ay</option>
              <option value="LAST_MONTH">Geçen Ay</option>
              <option value="LAST_3_MONTHS">Son 3 Ay</option>
              <option value="THIS_YEAR">Bu Yıl</option>
              <option value="CUSTOM">Özel Tarih Aralığı...</option>
            </select>
          </div>

          {/* Özel Tarih Seçildiyse Ek Tarih Kutucukları */}
          {dateRange === 'CUSTOM' && (
            <>
              <div>
                <label style={{ display: 'block', fontSize: 11 }}>Başlangıç</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  style={{ padding: '7px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11 }}>Bitiş</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  style={{ padding: '7px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                />
              </div>
            </>
          )}

          {/* GETİR BUTONU */}
          <div>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ padding: '9px 24px', fontWeight: 'bold', minWidth: 100 }}
            >
              GETİR
            </button>
          </div>

        </form>
      </div>

      {/* RAPOR TABLOSU ALANI */}
      <div className="folder-panel">
        <p style={{ color: '#64748b', fontSize: 13, margin: 0 }}>
          Yukarıdaki 3 kutucuktan seçim yapıp <strong>GETİR</strong> butonuna bastığınızda rapor verileri burada dökülecektir.
        </p>
      </div>
    </div>
  );
}
