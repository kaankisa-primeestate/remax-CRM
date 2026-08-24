import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { valuationsApi, PROPERTY_GROUPS, PROPERTY_TYPE_LABELS, COMP_TYPES } from '../api/valuations';
import { propertiesApi } from '../api/properties';

const money = (n) => (n != null && n !== '' ? new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(n) : '—');

const WIZARD_STEPS = [
  { key: 'details', label: '1. Mülk Detayları' },
  { key: 'comps', label: '2. Emsal Karşılaştırma' },
  { key: 'result', label: '3. SWOT & Sonuç' },
];

export default function ValuationWizardPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id;

  const [sourceMode, setSourceMode] = useState('external');
  const [properties, setProperties] = useState([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedType, setSelectedType] = useState('');
  const [sourceStepDone, setSourceStepDone] = useState(!isNew);

  const [valuationId, setValuationId] = useState(id || null);
  const [step, setStep] = useState('details');
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    subjectTitle: '',
    subjectProvince: '',
    subjectDistrict: '',
    subjectNeighborhood: '',
    subjectAddressDetail: '',
    subjectAreaM2: '',
    subjectNotes: '',
    subjectParcelNo: '',
    subjectLandShare: '',
    subjectDeedType: '',
    subjectEnvironmentNotes: '',
  });
  const [groupData, setGroupData] = useState({});

  const [comps, setComps] = useState([]);
  const [newComp, setNewComp] = useState({ title: '', areaM2: '', rooms: '', price: '', monthlyRent: '', capRate: '', compType: 'sold' });

  const [swot, setSwot] = useState({ swotStrengths: '', swotWeaknesses: '', swotOpportunities: '', swotThreats: '' });
  const [prices, setPrices] = useState({ estimatedValueMin: '', estimatedValueTarget: '', estimatedValueMax: '' });
  const [conclusionNotes, setConclusionNotes] = useState('');
  const [pdfDownloading, setPdfDownloading] = useState(false);

  useEffect(() => {
    propertiesApi.list({}).then(setProperties).catch(() => setProperties([]));
  }, []);

  const loadExisting = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { valuation, comps: loadedComps } = await valuationsApi.getOne(id);
      setValuationId(valuation.id);
      setSelectedGroup(valuation.propertyGroup);
      setSelectedType(valuation.propertyType);
      setForm({
        subjectTitle: valuation.subjectTitle || '',
        subjectProvince: valuation.subjectProvince || '',
        subjectDistrict: valuation.subjectDistrict || '',
        subjectNeighborhood: valuation.subjectNeighborhood || '',
        subjectAddressDetail: valuation.subjectAddressDetail || '',
        subjectAreaM2: valuation.subjectAreaM2 || '',
        subjectNotes: valuation.subjectNotes || '',
        subjectParcelNo: valuation.subjectParcelNo || '',
        subjectLandShare: valuation.subjectLandShare || '',
        subjectDeedType: valuation.subjectDeedType || '',
        subjectEnvironmentNotes: valuation.subjectEnvironmentNotes || '',
      });
      setGroupData(valuation.groupData || {});
      setSwot({
        swotStrengths: valuation.swotStrengths || '',
        swotWeaknesses: valuation.swotWeaknesses || '',
        swotOpportunities: valuation.swotOpportunities || '',
        swotThreats: valuation.swotThreats || '',
      });
      setPrices({
        estimatedValueMin: valuation.estimatedValueMin || '',
        estimatedValueTarget: valuation.estimatedValueTarget || '',
        estimatedValueMax: valuation.estimatedValueMax || '',
      });
      setConclusionNotes(valuation.conclusionNotes || '');
      setComps(loadedComps);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadExisting();
  }, [loadExisting]);

  async function handleSelectPortfolioProperty(propertyId) {
    setSelectedPropertyId(propertyId);
    if (!propertyId) return;
    try {
      const prefill = await valuationsApi.prefillFromProperty(propertyId);
      setSelectedGroup(prefill.propertyGroup);
      setSelectedType(prefill.propertyType);
      setForm((f) => ({
        ...f,
        subjectTitle: prefill.subjectTitle || '',
        subjectProvince: prefill.subjectProvince || '',
        subjectDistrict: prefill.subjectDistrict || '',
        subjectNeighborhood: prefill.subjectNeighborhood || '',
        subjectAreaM2: prefill.subjectAreaM2 || '',
        subjectDeedType: prefill.subjectDeedType || '',
      }));
      setGroupData(prefill.groupData || {});
    } catch {
      alert('Portföy bilgileri alınamadı.');
    }
  }

  function handleStartExternal(groupValue) {
    const group = PROPERTY_GROUPS.find((g) => g.value === groupValue);
    setSelectedGroup(groupValue);
    setSelectedType(group.types[0].value);
  }

  async function handleConfirmSource() {
    if (sourceMode === 'portfolio' && !selectedPropertyId) {
      alert('Lütfen bir portföy seçin.');
      return;
    }
    if (!selectedGroup) {
      alert('Lütfen mülk türünü seçin.');
      return;
    }
    if (!form.subjectTitle.trim() || !form.subjectProvince.trim() || !form.subjectDistrict.trim()) {
      alert('Başlık, İl ve İlçe zorunludur.');
      return;
    }
    setSaving(true);
    try {
      const created = await valuationsApi.create({
        propertyId: sourceMode === 'portfolio' ? selectedPropertyId : undefined,
        propertyGroup: selectedGroup,
        propertyType: selectedType,
        ...form,
        subjectAreaM2: Number(form.subjectAreaM2) || 0,
        groupData,
      });
      setValuationId(created.id);
      setSourceStepDone(true);
      setStep('details');
      navigate(`/degerleme/${created.id}`, { replace: true });
    } catch (err) {
      const message = err?.response?.data?.message ?? 'Analiz oluşturulamadı.';
      alert(Array.isArray(message) ? message.join(', ') : message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveDetails() {
    setSaving(true);
    try {
      await valuationsApi.update(valuationId, {
        ...form,
        subjectAreaM2: Number(form.subjectAreaM2) || 0,
        groupData,
      });
      setStep('comps');
    } catch {
      alert('Kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  }

  async function handleAddComp() {
    if (!newComp.title.trim()) return;
    try {
      const saved = await valuationsApi.addComp(valuationId, {
        title: newComp.title.trim(),
        areaM2: newComp.areaM2 ? Number(newComp.areaM2) : undefined,
        rooms: newComp.rooms || undefined,
        price: newComp.price ? Number(newComp.price) : undefined,
        monthlyRent: newComp.monthlyRent ? Number(newComp.monthlyRent) : undefined,
        capRate: newComp.capRate ? Number(newComp.capRate) : undefined,
        compType: newComp.compType,
      });
      setComps((prev) => [...prev, saved]);
      setNewComp({ title: '', areaM2: '', rooms: '', price: '', monthlyRent: '', capRate: '', compType: 'sold' });
    } catch {
      alert('Emsal eklenemedi.');
    }
  }

  async function handleToggleCompIncluded(comp) {
    const updated = await valuationsApi.updateComp(comp.id, { includedInAnalysis: !comp.includedInAnalysis }).catch(() => null);
    if (updated) setComps((prev) => prev.map((c) => (c.id === comp.id ? updated : c)));
  }

  async function handleRemoveComp(compId) {
    if (!confirm('Bu emsal silinsin mi?')) return;
    setComps((prev) => prev.filter((c) => c.id !== compId));
    try {
      await valuationsApi.removeComp(compId);
    } catch {
      loadExisting();
    }
  }

  function computeSuggestedAverage() {
    const included = comps.filter((c) => c.includedInAnalysis);
    if (selectedGroup === 'commercial') {
      const withCap = included.filter((c) => c.capRate);
      if (withCap.length === 0) return null;
      const avg = withCap.reduce((sum, c) => sum + Number(c.capRate), 0) / withCap.length;
      return `Ortalama Cap Oranı: %${avg.toFixed(1)}`;
    }
    const withPrice = included.filter((c) => c.price && c.areaM2);
    if (withPrice.length === 0) return null;
    const avgUnit = withPrice.reduce((sum, c) => sum + Number(c.price) / Number(c.areaM2), 0) / withPrice.length;
    const suggestion = avgUnit * Number(form.subjectAreaM2 || 0);
    return { avgUnit, suggestion };
  }

  function handleApplySuggestion() {
    const result = computeSuggestedAverage();
    if (!result || typeof result === 'string') return;
    setPrices({
      estimatedValueMin: Math.round(result.suggestion * 0.95),
      estimatedValueTarget: Math.round(result.suggestion),
      estimatedValueMax: Math.round(result.suggestion * 1.05),
    });
  }

  async function handleSaveSwotAndFinish(markCompleted) {
    setSaving(true);
    try {
      await valuationsApi.update(valuationId, {
        ...swot,
        estimatedValueMin: prices.estimatedValueMin ? Number(prices.estimatedValueMin) : undefined,
        estimatedValueTarget: prices.estimatedValueTarget ? Number(prices.estimatedValueTarget) : undefined,
        estimatedValueMax: prices.estimatedValueMax ? Number(prices.estimatedValueMax) : undefined,
        conclusionNotes: conclusionNotes || undefined,
        status: markCompleted ? 'completed' : 'draft',
      });
      alert(markCompleted ? 'Analiz tamamlandı olarak kaydedildi.' : 'Kaydedildi.');
    } catch {
      alert('Kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDownloadPdf() {
    setPdfDownloading(true);
    try {
      await handleSaveSwotAndFinish(false);
      await valuationsApi.downloadPdf(valuationId, `piyasa-analizi-${form.subjectTitle.replace(/\s+/g, '-')}`);
    } catch {
      alert('PDF indirilemedi.');
    } finally {
      setPdfDownloading(false);
    }
  }

  const groupInfo = PROPERTY_GROUPS.find((g) => g.value === selectedGroup);

  if (loading) {
    return <div className="empty-state">Yükleniyor…</div>;
  }

  if (isNew && !sourceStepDone) {
    return (
      <div>
        <button type="button" onClick={() => navigate('/degerleme')} style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--muted)', background: 'transparent', border: 'none', padding: 0, marginBottom: 12, cursor: 'pointer', display: 'block' }}>
          ← Analizler Listesine Dön
        </button>
        <h2 className="dossier__name" style={{ marginBottom: 16 }}>Yeni Piyasa Değer Analizi</h2>

        <div className="folder-panel" style={{ marginBottom: 20 }}>
          <h4 style={{ marginTop: 0 }}>1. Bu analiz hangi mülk için?</h4>
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            <button type="button" className={sourceMode === 'external' ? 'btn btn-primary' : 'btn btn-secondary'} onClick={() => setSourceMode('external')}>
              Harici Mülk (Sistemde Kayıtlı Değil)
            </button>
            <button type="button" className={sourceMode === 'portfolio' ? 'btn btn-primary' : 'btn btn-secondary'} onClick={() => setSourceMode('portfolio')}>
              Mevcut Portföyden Seç
            </button>
          </div>

          {sourceMode === 'portfolio' && (
            <div className="form-field" style={{ maxWidth: 400 }}>
              <label>Portföy</label>
              <select value={selectedPropertyId} onChange={(e) => handleSelectPortfolioProperty(e.target.value)}>
                <option value="">Seçiniz</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
              {selectedGroup && <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>✓ Bilgiler otomatik dolduruldu, türü: {groupInfo?.label}</p>}
            </div>
          )}
        </div>

        {sourceMode === 'external' && (
          <div className="folder-panel" style={{ marginBottom: 20 }}>
            <h4 style={{ marginTop: 0 }}>2. Mülk Türünü Seçin</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
              {PROPERTY_GROUPS.map((g) => (
                <button
                  key={g.value}
                  type="button"
                  onClick={() => handleStartExternal(g.value)}
                  style={{
                    textAlign: 'left', padding: 16, borderRadius: 8, cursor: 'pointer',
                    border: selectedGroup === g.value ? '2px solid var(--ink-navy)' : '1px solid var(--paper-line)',
                    background: selectedGroup === g.value ? '#eef3f9' : 'white',
                  }}
                >
                  <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{g.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{g.description}</div>
                </button>
              ))}
            </div>
            {selectedGroup && (
              <div className="form-field" style={{ maxWidth: 300, marginTop: 16 }}>
                <label>Spesifik Tür</label>
                <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)}>
                  {groupInfo.types.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {selectedGroup && (
          <div className="folder-panel">
            <h4 style={{ marginTop: 0 }}>3. Temel Bilgiler</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div className="form-field">
                <label>Başlık *</label>
                <input value={form.subjectTitle} onChange={(e) => setForm((f) => ({ ...f, subjectTitle: e.target.value }))} placeholder="Örn: Kadıköy Bostancı Camii Sokak 3+1" />
              </div>
              <div className="form-field">
                <label>Alan (m²) *</label>
                <input type="number" value={form.subjectAreaM2} onChange={(e) => setForm((f) => ({ ...f, subjectAreaM2: e.target.value }))} />
              </div>
              <div className="form-field">
                <label>İl *</label>
                <input value={form.subjectProvince} onChange={(e) => setForm((f) => ({ ...f, subjectProvince: e.target.value }))} placeholder="İstanbul" />
              </div>
              <div className="form-field">
                <label>İlçe *</label>
                <input value={form.subjectDistrict} onChange={(e) => setForm((f) => ({ ...f, subjectDistrict: e.target.value }))} placeholder="Kadıköy" />
              </div>
              <div className="form-field">
                <label>Mahalle</label>
                <input value={form.subjectNeighborhood} onChange={(e) => setForm((f) => ({ ...f, subjectNeighborhood: e.target.value }))} placeholder="Bostancı" />
              </div>
              <div className="form-field">
                <label>Sokak / Apartman / Daire No</label>
                <input value={form.subjectAddressDetail} onChange={(e) => setForm((f) => ({ ...f, subjectAddressDetail: e.target.value }))} placeholder="Camii Sokak, Yıldız Apt. No:5" />
              </div>
            </div>
            <button type="button" className="btn btn-primary" style={{ marginTop: 16 }} onClick={handleConfirmSource} disabled={saving}>
              {saving ? 'Oluşturuluyor…' : 'Devam Et →'}
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <button type="button" onClick={() => navigate('/degerleme')} style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--muted)', background: 'transparent', border: 'none', padding: 0, marginBottom: 12, cursor: 'pointer', display: 'block' }}>
        ← Analizler Listesine Dön
      </button>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h2 className="dossier__name" style={{ margin: 0 }}>{form.subjectTitle}</h2>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--muted)' }}>
            {PROPERTY_TYPE_LABELS[selectedType] || selectedType} · {form.subjectDistrict}, {form.subjectProvince}
          </p>
        </div>
      </div>

      <div className="folder-tabs" style={{ marginBottom: 0 }}>
        {WIZARD_STEPS.map((s) => (
          <button key={s.key} type="button" className={`folder-tab${step === s.key ? ' active' : ''}`} onClick={() => setStep(s.key)}>
            {s.label}
          </button>
        ))}
      </div>

      <div className="folder-panel" style={{ marginTop: 0, borderTopLeftRadius: 0 }}>
        {step === 'details' && (
          <div>
            <h4 style={{ marginTop: 0 }}>Mülk Detayları</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              <div className="form-field">
                <label>Başlık</label>
                <input value={form.subjectTitle} onChange={(e) => setForm((f) => ({ ...f, subjectTitle: e.target.value }))} />
              </div>
              <div className="form-field">
                <label>Alan (m²)</label>
                <input type="number" value={form.subjectAreaM2} onChange={(e) => setForm((f) => ({ ...f, subjectAreaM2: e.target.value }))} />
              </div>
              <div className="form-field">
                <label>İl</label>
                <input value={form.subjectProvince} onChange={(e) => setForm((f) => ({ ...f, subjectProvince: e.target.value }))} />
              </div>
              <div className="form-field">
                <label>İlçe</label>
                <input value={form.subjectDistrict} onChange={(e) => setForm((f) => ({ ...f, subjectDistrict: e.target.value }))} />
              </div>
              <div className="form-field">
                <label>Mahalle</label>
                <input value={form.subjectNeighborhood} onChange={(e) => setForm((f) => ({ ...f, subjectNeighborhood: e.target.value }))} />
              </div>
              <div className="form-field">
                <label>Sokak / Apartman / Daire No</label>
                <input value={form.subjectAddressDetail} onChange={(e) => setForm((f) => ({ ...f, subjectAddressDetail: e.target.value }))} />
              </div>
            </div>

            {(selectedGroup === 'residential' || selectedGroup === 'mixed') && (
              <>
                <h5>Konut Özellikleri</h5>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
                  <div className="form-field">
                    <label>Oda Sayısı</label>
                    <input value={groupData.rooms || ''} onChange={(e) => setGroupData((g) => ({ ...g, rooms: e.target.value }))} placeholder="3+1" />
                  </div>
                  <div className="form-field">
                    <label>Bina Yaşı</label>
                    <input type="number" value={groupData.buildingAge || ''} onChange={(e) => setGroupData((g) => ({ ...g, buildingAge: e.target.value }))} />
                  </div>
                  <div className="form-field">
                    <label>Bulunduğu Kat</label>
                    <input value={groupData.floor || ''} onChange={(e) => setGroupData((g) => ({ ...g, floor: e.target.value }))} />
                  </div>
                  <div className="form-field">
                    <label>Isıtma Tipi</label>
                    <input value={groupData.heatingType || ''} onChange={(e) => setGroupData((g) => ({ ...g, heatingType: e.target.value }))} placeholder="Doğalgaz Kombi" />
                  </div>
                  <div className="form-field">
                    <label>Manzara</label>
                    <input value={groupData.view || ''} onChange={(e) => setGroupData((g) => ({ ...g, view: e.target.value }))} placeholder="Deniz Manzaralı" />
                  </div>
                  <div className="form-field">
                    <label>Otopark</label>
                    <select value={groupData.hasParking ? 'true' : 'false'} onChange={(e) => setGroupData((g) => ({ ...g, hasParking: e.target.value === 'true' }))}>
                      <option value="false">Yok</option>
                      <option value="true">Var</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            {(selectedGroup === 'commercial' || selectedGroup === 'mixed') && (
              <>
                <h5>Gelir Bilgileri</h5>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
                  <div className="form-field">
                    <label>Aylık Kira Geliri (TL)</label>
                    <input type="number" value={groupData.monthlyRent || ''} onChange={(e) => setGroupData((g) => ({ ...g, monthlyRent: e.target.value }))} />
                  </div>
                  <div className="form-field">
                    <label>Doluluk Oranı (%)</label>
                    <input type="number" value={groupData.occupancyRate || ''} onChange={(e) => setGroupData((g) => ({ ...g, occupancyRate: e.target.value }))} />
                  </div>
                  <div className="form-field">
                    <label>Kapitalizasyon (Cap) Oranı (%)</label>
                    <input type="number" value={groupData.capRate || ''} onChange={(e) => setGroupData((g) => ({ ...g, capRate: e.target.value }))} />
                  </div>
                  <div className="form-field full">
                    <label>Kiracı Bilgisi / Notlar</label>
                    <input value={groupData.tenantInfo || ''} onChange={(e) => setGroupData((g) => ({ ...g, tenantInfo: e.target.value }))} placeholder="Örn: 5 yıllık kiracı, zincir market" />
                  </div>
                </div>
              </>
            )}

            {selectedGroup === 'land' && (
              <>
                <h5>Arazi Özellikleri</h5>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
                  <div className="form-field">
                    <label>İmar Durumu</label>
                    <input value={groupData.zoningStatus || ''} onChange={(e) => setGroupData((g) => ({ ...g, zoningStatus: e.target.value }))} placeholder="Konut İmarlı" />
                  </div>
                  <div className="form-field">
                    <label>KAKS (Emsal)</label>
                    <input value={groupData.kaks || ''} onChange={(e) => setGroupData((g) => ({ ...g, kaks: e.target.value }))} placeholder="1.50" />
                  </div>
                  <div className="form-field">
                    <label>Yola Cephe</label>
                    <select value={groupData.roadFrontage ? 'true' : 'false'} onChange={(e) => setGroupData((g) => ({ ...g, roadFrontage: e.target.value === 'true' }))}>
                      <option value="false">Yok</option>
                      <option value="true">Var</option>
                    </select>
                  </div>
                  <div className="form-field">
                    <label>Topografya</label>
                    <input value={groupData.topography || ''} onChange={(e) => setGroupData((g) => ({ ...g, topography: e.target.value }))} placeholder="Düz" />
                  </div>
                  {selectedType === 'field' && (
                    <>
                      <div className="form-field">
                        <label>Sulama Durumu</label>
                        <input value={groupData.irrigationStatus || ''} onChange={(e) => setGroupData((g) => ({ ...g, irrigationStatus: e.target.value }))} placeholder="Sulu Tarım" />
                      </div>
                      <div className="form-field">
                        <label>Ürün / Ağaç Bilgisi</label>
                        <input value={groupData.cropInfo || ''} onChange={(e) => setGroupData((g) => ({ ...g, cropInfo: e.target.value }))} placeholder="120 adet zeytin ağacı" />
                      </div>
                    </>
                  )}
                </div>
              </>
            )}

            <h5>Tapu Bilgileri</h5>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
              <div className="form-field">
                <label>Ada / Parsel No</label>
                <input value={form.subjectParcelNo} onChange={(e) => setForm((f) => ({ ...f, subjectParcelNo: e.target.value }))} />
              </div>
              <div className="form-field">
                <label>Arsa Payı</label>
                <input value={form.subjectLandShare} onChange={(e) => setForm((f) => ({ ...f, subjectLandShare: e.target.value }))} placeholder="24/480" />
              </div>
              <div className="form-field">
                <label>Tapu Türü</label>
                <input value={form.subjectDeedType} onChange={(e) => setForm((f) => ({ ...f, subjectDeedType: e.target.value }))} placeholder="Kat Mülkiyeti" />
              </div>
            </div>

            <div className="form-field full" style={{ marginBottom: 16 }}>
              <label>Konum ve Çevre Notları</label>
              <textarea rows={3} value={form.subjectEnvironmentNotes} onChange={(e) => setForm((f) => ({ ...f, subjectEnvironmentNotes: e.target.value }))} placeholder="Ulaşım, sosyal alanlar, eğitim/sağlık kurumlarına yakınlık, bölgesel piyasa trendi vb." style={{ width: '100%', padding: 8 }} />
            </div>

            <button type="button" className="btn btn-primary" onClick={handleSaveDetails} disabled={saving}>
              {saving ? 'Kaydediliyor…' : 'Kaydet ve Devam Et →'}
            </button>
          </div>
        )}

        {step === 'comps' && (
          <div>
            <h4 style={{ marginTop: 0 }}>{selectedGroup === 'commercial' ? 'Emsal Kira / Gelir Karşılaştırması' : 'Emsal Karşılaştırma Tablosu'}</h4>
            <p style={{ fontSize: 12, color: 'var(--muted)' }}>
              En az 3 emsal eklemeniz önerilir — en yakın 3-6 ay içindeki satışlar/kiralar en güvenilir sonucu verir.
            </p>

            {comps.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                {comps.map((c) => (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #e2e8f0', opacity: c.includedInAnalysis ? 1 : 0.5 }}>
                    <input type="checkbox" checked={c.includedInAnalysis} onChange={() => handleToggleCompIncluded(c)} title="Analize dahil et/çıkar" />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{c.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                        {c.areaM2 ? `${c.areaM2} m² · ` : ''}{c.rooms ? `${c.rooms} · ` : ''}{COMP_TYPES.find((t) => t.value === c.compType)?.label}
                      </div>
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                      {selectedGroup === 'commercial' ? (c.monthlyRent ? `${money(c.monthlyRent)}/ay` : '—') : money(c.price)}
                    </div>
                    <button type="button" className="task-row__delete" onClick={() => handleRemoveComp(c.id)}>✕</button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end', background: '#f8fafc', padding: 12, borderRadius: 6 }}>
              <div className="form-field" style={{ margin: 0, minWidth: 160 }}>
                <label>Emsal Adı / Konumu</label>
                <input value={newComp.title} onChange={(e) => setNewComp((c) => ({ ...c, title: e.target.value }))} placeholder="Örn: Aynı sokakta 3+1" />
              </div>
              <div className="form-field" style={{ margin: 0, width: 90 }}>
                <label>m²</label>
                <input type="number" value={newComp.areaM2} onChange={(e) => setNewComp((c) => ({ ...c, areaM2: e.target.value }))} />
              </div>
              {selectedGroup !== 'commercial' && selectedGroup !== 'land' && (
                <div className="form-field" style={{ margin: 0, width: 80 }}>
                  <label>Oda</label>
                  <input value={newComp.rooms} onChange={(e) => setNewComp((c) => ({ ...c, rooms: e.target.value }))} placeholder="3+1" />
                </div>
              )}
              {selectedGroup === 'commercial' ? (
                <>
                  <div className="form-field" style={{ margin: 0, width: 130 }}>
                    <label>Aylık Kira (TL)</label>
                    <input type="number" value={newComp.monthlyRent} onChange={(e) => setNewComp((c) => ({ ...c, monthlyRent: e.target.value }))} />
                  </div>
                  <div className="form-field" style={{ margin: 0, width: 100 }}>
                    <label>Cap Oranı (%)</label>
                    <input type="number" value={newComp.capRate} onChange={(e) => setNewComp((c) => ({ ...c, capRate: e.target.value }))} />
                  </div>
                </>
              ) : (
                <div className="form-field" style={{ margin: 0, width: 140 }}>
                  <label>Fiyat (TL)</label>
                  <input type="number" value={newComp.price} onChange={(e) => setNewComp((c) => ({ ...c, price: e.target.value }))} />
                </div>
              )}
              <div className="form-field" style={{ margin: 0, width: 130 }}>
                <label>Durum</label>
                <select value={newComp.compType} onChange={(e) => setNewComp((c) => ({ ...c, compType: e.target.value }))}>
                  {COMP_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <button type="button" className="btn btn-primary" onClick={handleAddComp}>+ Ekle</button>
            </div>

            <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
              <button type="button" className="btn btn-secondary" onClick={() => setStep('details')}>← Geri</button>
              <button type="button" className="btn btn-primary" onClick={() => setStep('result')}>Devam Et →</button>
            </div>
          </div>
        )}

        {step === 'result' && (
          <div>
            <h4 style={{ marginTop: 0 }}>SWOT Analizi</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
              <div className="form-field">
                <label>Güçlü Yönler (+)</label>
                <textarea rows={2} value={swot.swotStrengths} onChange={(e) => setSwot((s) => ({ ...s, swotStrengths: e.target.value }))} style={{ width: '100%', padding: 8 }} />
              </div>
              <div className="form-field">
                <label>Zayıf Yönler (-)</label>
                <textarea rows={2} value={swot.swotWeaknesses} onChange={(e) => setSwot((s) => ({ ...s, swotWeaknesses: e.target.value }))} style={{ width: '100%', padding: 8 }} />
              </div>
              <div className="form-field">
                <label>Fırsatlar</label>
                <textarea rows={2} value={swot.swotOpportunities} onChange={(e) => setSwot((s) => ({ ...s, swotOpportunities: e.target.value }))} style={{ width: '100%', padding: 8 }} />
              </div>
              <div className="form-field">
                <label>Tehditler / Riskler</label>
                <textarea rows={2} value={swot.swotThreats} onChange={(e) => setSwot((s) => ({ ...s, swotThreats: e.target.value }))} style={{ width: '100%', padding: 8 }} />
              </div>
            </div>

            <h4>Sonuç ve Fiyat Tavsiyesi</h4>
            {computeSuggestedAverage() && (
              <div style={{ background: '#eef3f9', borderRadius: 6, padding: '10px 14px', marginBottom: 14, fontSize: 13 }}>
                {typeof computeSuggestedAverage() === 'string' ? (
                  computeSuggestedAverage()
                ) : (
                  <>
                    Emsallere göre önerilen değer: <strong>{money(computeSuggestedAverage().suggestion)}</strong>{' '}
                    (m² birim fiyatı: {money(computeSuggestedAverage().avgUnit)})
                    <button type="button" className="btn btn-secondary" style={{ marginLeft: 10, fontSize: 11, padding: '3px 10px' }} onClick={handleApplySuggestion}>
                      Bu öneriyi kullan
                    </button>
                  </>
                )}
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                  Bu sadece bir öneridir — aşağıdaki tüm değerleri kendi profesyonel değerlendirmenize göre değiştirebilirsiniz.
                </div>
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
              <div className="form-field">
                <label>Hızlı Satış Taban Fiyatı</label>
                <input type="number" value={prices.estimatedValueMin} onChange={(e) => setPrices((p) => ({ ...p, estimatedValueMin: e.target.value }))} />
              </div>
              <div className="form-field">
                <label>Hedeflenen Gerçekçi Fiyat</label>
                <input type="number" value={prices.estimatedValueTarget} onChange={(e) => setPrices((p) => ({ ...p, estimatedValueTarget: e.target.value }))} />
              </div>
              <div className="form-field">
                <label>Pazarlık Paylı Açılış Fiyatı</label>
                <input type="number" value={prices.estimatedValueMax} onChange={(e) => setPrices((p) => ({ ...p, estimatedValueMax: e.target.value }))} />
              </div>
            </div>
            <div className="form-field full" style={{ marginBottom: 20 }}>
              <label>Danışman Notu / Strateji</label>
              <textarea rows={3} value={conclusionNotes} onChange={(e) => setConclusionNotes(e.target.value)} placeholder="Pazarlama stratejisi ve mülk sahibine önerileriniz…" style={{ width: '100%', padding: 8 }} />
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setStep('comps')}>← Geri</button>
              <button type="button" className="btn btn-secondary" onClick={() => handleSaveSwotAndFinish(false)} disabled={saving}>
                Taslak Olarak Kaydet
              </button>
              <button type="button" className="btn btn-primary" onClick={() => handleSaveSwotAndFinish(true)} disabled={saving}>
                ✓ Analizi Tamamla
              </button>
              <button type="button" className="btn btn-primary" onClick={handleDownloadPdf} disabled={pdfDownloading}>
                {pdfDownloading ? 'Hazırlanıyor…' : '📄 PDF Raporu İndir'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
