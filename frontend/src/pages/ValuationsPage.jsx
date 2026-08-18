import { useEffect, useState, useCallback } from 'react';
import { valuationsApi, COMP_TYPES, VALUATION_STATUSES } from '../api/valuations';
import { propertiesApi } from '../api/properties';
import { useAuth } from '../context/AuthContext.jsx';

const emptyCreateForm = {
  mode: 'existing', // 'existing' | 'manual'
  propertyId: '',
  subjectTitle: '',
  subjectProvince: '',
  subjectDistrict: '',
  subjectNeighborhood: '',
  subjectAreaM2: '',
  subjectRooms: '',
  subjectBuildingAge: '',
  subjectFloor: '',
};

const emptyCompForm = {
  title: '',
  district: '',
  areaM2: '',
  rooms: '',
  price: '',
  compType: 'active_listing',
  transactionDate: '',
  sourceNote: '',
};

function money(n) {
  if (n == null || n === '') return '—';
  return `${Number(n).toLocaleString('tr-TR')} ₺`;
}

// Piyasa Deger Analizi (KPA -- Karsilastirmali Piyasa Analizi). ONEMLI:
// bu resmi bir SPK Gayrimenkul Degerleme Raporu degildir -- sadece
// danismanin piyasa gozlemine dayanan gayri resmi bir fiyat analizi
// araci. Hem kendi veritabanimizdan OTOMATIK karsilastirma bulur, hem
// danismanin kendi arastirmasindan ELLE karsilastirma eklemesine izin
// verir -- ikisi birlikte, melez bir sistem.
export default function ValuationsPage() {
  const { isBroker } = useAuth();
  const [valuations, setValuations] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);

  const [detail, setDetail] = useState(null); // { valuation, comps }
  const [detailLoading, setDetailLoading] = useState(false);
  const [savingValuation, setSavingValuation] = useState(false);
  const [showAddComp, setShowAddComp] = useState(false);
  const [compForm, setCompForm] = useState(emptyCompForm);
  const [savingComp, setSavingComp] = useState(false);
  const [rematching, setRematching] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [vals, props] = await Promise.all([valuationsApi.list(), propertiesApi.list({})]);
    setValuations(vals);
    setProperties(props);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function openDetail(id) {
    setDetailLoading(true);
    setDetail(null);
    try {
      const data = await valuationsApi.get(id);
      setDetail(data);
    } catch {
      alert('Analiz yüklenemedi.');
    } finally {
      setDetailLoading(false);
    }
  }

  function closeDetail() {
    setDetail(null);
    setShowAddComp(false);
    setCompForm(emptyCompForm);
  }

  async function handleCreate(e) {
    e.preventDefault();
    setError(null);
    setCreating(true);
    try {
      const payload =
        createForm.mode === 'existing'
          ? { propertyId: createForm.propertyId }
          : {
              subjectTitle: createForm.subjectTitle,
              subjectProvince: createForm.subjectProvince,
              subjectDistrict: createForm.subjectDistrict,
              subjectNeighborhood: createForm.subjectNeighborhood || undefined,
              subjectAreaM2: Number(createForm.subjectAreaM2),
              subjectRooms: createForm.subjectRooms || undefined,
              subjectBuildingAge: createForm.subjectBuildingAge ? Number(createForm.subjectBuildingAge) : undefined,
              subjectFloor: createForm.subjectFloor || undefined,
            };
      const created = await valuationsApi.create(payload);
      setShowCreate(false);
      setCreateForm(emptyCreateForm);
      await load();
      openDetail(created.id);
    } catch (err) {
      const message = err?.response?.data?.message ?? 'Analiz oluşturulamadı.';
      setError(Array.isArray(message) ? message.join(', ') : message);
    } finally {
      setCreating(false);
    }
  }

  async function handleSaveValuationField(field, value) {
    if (!detail) return;
    setSavingValuation(true);
    try {
      const updated = await valuationsApi.update(detail.valuation.id, { [field]: value });
      setDetail((d) => ({ ...d, valuation: updated }));
      setValuations((prev) => prev.map((v) => (v.id === updated.id ? updated : v)));
    } catch {
      alert('Güncellenemedi, tekrar deneyin.');
    } finally {
      setSavingValuation(false);
    }
  }

  async function handleRematch() {
    if (!detail) return;
    setRematching(true);
    try {
      await valuationsApi.rematch(detail.valuation.id);
      openDetail(detail.valuation.id);
    } catch {
      alert('Yeniden eşleştirme başarısız oldu.');
    } finally {
      setRematching(false);
    }
  }

  async function handleAddComp(e) {
    e.preventDefault();
    if (!detail) return;
    setSavingComp(true);
    try {
      await valuationsApi.addComp(detail.valuation.id, {
        ...compForm,
        areaM2: compForm.areaM2 ? Number(compForm.areaM2) : undefined,
        price: Number(compForm.price),
        transactionDate: compForm.transactionDate || undefined,
      });
      setShowAddComp(false);
      setCompForm(emptyCompForm);
      openDetail(detail.valuation.id);
    } catch (err) {
      alert(err?.response?.data?.message || 'Karşılaştırma eklenemedi.');
    } finally {
      setSavingComp(false);
    }
  }

  async function handleUpdateCompField(compId, field, value) {
    try {
      await valuationsApi.updateComp(compId, { [field]: value });
      openDetail(detail.valuation.id);
    } catch {
      alert('Karşılaştırma güncellenemedi.');
    }
  }

  async function handleRemoveComp(compId) {
    if (!confirm('Bu karşılaştırma silinsin mi?')) return;
    try {
      await valuationsApi.removeComp(compId);
      openDetail(detail.valuation.id);
    } catch {
      alert('Silinemedi.');
    }
  }

  async function handleDeleteValuation(id) {
    if (!confirm('Bu analiz tamamen silinsin mi?')) return;
    try {
      await valuationsApi.remove(id);
      closeDetail();
      load();
    } catch {
      alert('Silinemedi.');
    }
  }

  async function handleDownloadPdf() {
    if (!detail) return;
    setDownloadingPdf(true);
    try {
      await valuationsApi.downloadPdf(detail.valuation.id, detail.valuation.subjectTitle);
    } catch {
      alert('PDF indirilemedi.');
    } finally {
      setDownloadingPdf(false);
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <h2 className="dossier__name" style={{ margin: 0 }}>📊 Piyasa Değer Analizi</h2>
        <button type="button" className="btn btn-primary" onClick={() => setShowCreate(true)}>
          + Yeni Analiz
        </button>
      </div>
      <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: -10, marginBottom: 20 }}>
        Bu araç resmi bir SPK Gayrimenkul Değerleme Raporu değildir — danışmanın piyasa gözlemine dayanan gayri resmi bir Karşılaştırmalı Piyasa Analizi (KPA) aracıdır. Sistem önce kendi veritabanınızdan benzer mülkleri otomatik bulur, bulamazsa (ya da yeterli değilse) kendi araştırmanızdan elle ekleyebilirsiniz.
      </p>

      {loading ? (
        <div className="empty-state">Yükleniyor…</div>
      ) : valuations.length === 0 ? (
        <div className="empty-state">Henüz bir analiz oluşturulmamış. "+ Yeni Analiz" ile başlayın.</div>
      ) : (
        <div>
          {valuations.map((v) => (
            <div key={v.id} className="record-row" style={{ cursor: 'pointer' }} onClick={() => openDetail(v.id)}>
              <span className="record-row__name">{v.subjectTitle}</span>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                {v.subjectDistrict} · {v.subjectAreaM2} m²
                {v.estimatedValueMin && ` · ${money(v.estimatedValueMin)} – ${money(v.estimatedValueMax)}`}
                {' · '}
                {VALUATION_STATUSES.find((s) => s.value === v.status)?.label}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* --- Yeni Analiz Modali --- */}
      {showCreate && (
        <div className="modal-backdrop" onClick={() => setShowCreate(false)}>
          <div className="modal" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h2 style={{ margin: 0 }}>Yeni Piyasa Değer Analizi</h2>
              <button type="button" className="office-modal__close" onClick={() => setShowCreate(false)}>✕</button>
            </div>
            <form onSubmit={handleCreate}>
              <div style={{ display: 'flex', gap: 14, marginBottom: 14 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, fontWeight: 400 }}>
                  <input type="radio" checked={createForm.mode === 'existing'} onChange={() => setCreateForm((f) => ({ ...f, mode: 'existing' }))} />
                  Mevcut bir portföyden
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, fontWeight: 400 }}>
                  <input type="radio" checked={createForm.mode === 'manual'} onChange={() => setCreateForm((f) => ({ ...f, mode: 'manual' }))} />
                  Henüz sistemde yok (elle gir)
                </label>
              </div>

              {createForm.mode === 'existing' ? (
                <div className="form-field">
                  <label>Portföy Seçin</label>
                  <select value={createForm.propertyId} onChange={(e) => setCreateForm((f) => ({ ...f, propertyId: e.target.value }))} required>
                    <option value="">Seçiniz</option>
                    {properties.map((p) => (
                      <option key={p.id} value={p.id}>{p.title} — {p.district}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="form-grid">
                  <div className="form-field full">
                    <label>Başlık</label>
                    <input value={createForm.subjectTitle} onChange={(e) => setCreateForm((f) => ({ ...f, subjectTitle: e.target.value }))} placeholder="Örn: Kadıköy 3+1 Potansiyel Satıcı" required />
                  </div>
                  <div className="form-field">
                    <label>İl</label>
                    <input value={createForm.subjectProvince} onChange={(e) => setCreateForm((f) => ({ ...f, subjectProvince: e.target.value }))} required />
                  </div>
                  <div className="form-field">
                    <label>İlçe</label>
                    <input value={createForm.subjectDistrict} onChange={(e) => setCreateForm((f) => ({ ...f, subjectDistrict: e.target.value }))} required />
                  </div>
                  <div className="form-field">
                    <label>Mahalle (opsiyonel)</label>
                    <input value={createForm.subjectNeighborhood} onChange={(e) => setCreateForm((f) => ({ ...f, subjectNeighborhood: e.target.value }))} />
                  </div>
                  <div className="form-field">
                    <label>Metrekare</label>
                    <input type="number" min="1" value={createForm.subjectAreaM2} onChange={(e) => setCreateForm((f) => ({ ...f, subjectAreaM2: e.target.value }))} required />
                  </div>
                  <div className="form-field">
                    <label>Oda Sayısı (opsiyonel)</label>
                    <input value={createForm.subjectRooms} onChange={(e) => setCreateForm((f) => ({ ...f, subjectRooms: e.target.value }))} placeholder="Örn: 3+1" />
                  </div>
                  <div className="form-field">
                    <label>Bina Yaşı (opsiyonel)</label>
                    <input type="number" min="0" value={createForm.subjectBuildingAge} onChange={(e) => setCreateForm((f) => ({ ...f, subjectBuildingAge: e.target.value }))} />
                  </div>
                  <div className="form-field">
                    <label>Kat (opsiyonel)</label>
                    <input value={createForm.subjectFloor} onChange={(e) => setCreateForm((f) => ({ ...f, subjectFloor: e.target.value }))} />
                  </div>
                </div>
              )}

              {error && <div className="form-error">{error}</div>}
              <div className="modal-actions" style={{ marginTop: 14 }}>
                <button type="submit" className="btn btn-primary" disabled={creating}>
                  {creating ? 'Oluşturuluyor…' : 'Oluştur ve Otomatik Eşleştir'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- Detay Modali --- */}
      {(detail || detailLoading) && (
        <div className="modal-backdrop" onClick={closeDetail}>
          <div className="modal" style={{ maxWidth: 760 }} onClick={(e) => e.stopPropagation()}>
            {detailLoading ? (
              <div className="empty-state">Yükleniyor…</div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h2 style={{ margin: 0 }}>{detail.valuation.subjectTitle}</h2>
                  <button type="button" className="office-modal__close" onClick={closeDetail}>✕</button>
                </div>

                <div style={{ maxHeight: '65vh', overflowY: 'auto', paddingRight: 4 }}>
                  <div className="agent-card__profile-info" style={{ marginBottom: 16 }}>
                    <div className="agent-card__info-group">
                      <div className="agent-card__info-title">Mülk</div>
                      <div className="agent-card__info-text">
                        {detail.valuation.subjectProvince} / {detail.valuation.subjectDistrict}
                        {detail.valuation.subjectNeighborhood && ` / ${detail.valuation.subjectNeighborhood}`}
                        {' · '}{detail.valuation.subjectAreaM2} m²
                        {detail.valuation.subjectRooms && ` · ${detail.valuation.subjectRooms}`}
                        {detail.valuation.subjectBuildingAge != null && ` · ${detail.valuation.subjectBuildingAge} yaşında`}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <h4 style={{ fontFamily: 'var(--font-display)', margin: 0 }}>Karşılaştırma Tablosu (Comps)</h4>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button type="button" className="btn btn-secondary" style={{ fontSize: 11, padding: '4px 10px' }} disabled={rematching} onClick={handleRematch}>
                        {rematching ? '…' : '🔄 Yeniden Otomatik Eşleştir'}
                      </button>
                      <button type="button" className="btn btn-secondary" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => setShowAddComp((v) => !v)}>
                        + Elle Ekle
                      </button>
                    </div>
                  </div>

                  {showAddComp && (
                    <form onSubmit={handleAddComp} style={{ background: 'var(--paper)', border: '1px solid var(--paper-line)', borderRadius: 8, padding: 12, marginBottom: 12 }}>
                      <div className="form-grid">
                        <div className="form-field full">
                          <label>Başlık / Açıklama</label>
                          <input value={compForm.title} onChange={(e) => setCompForm((f) => ({ ...f, title: e.target.value }))} placeholder="Örn: sahibinden.com'da gördüğüm 3+1" required />
                        </div>
                        <div className="form-field">
                          <label>Metrekare</label>
                          <input type="number" value={compForm.areaM2} onChange={(e) => setCompForm((f) => ({ ...f, areaM2: e.target.value }))} />
                        </div>
                        <div className="form-field">
                          <label>Oda Sayısı</label>
                          <input value={compForm.rooms} onChange={(e) => setCompForm((f) => ({ ...f, rooms: e.target.value }))} />
                        </div>
                        <div className="form-field">
                          <label>Fiyat</label>
                          <input type="number" value={compForm.price} onChange={(e) => setCompForm((f) => ({ ...f, price: e.target.value }))} required />
                        </div>
                        <div className="form-field">
                          <label>Durum</label>
                          <select value={compForm.compType} onChange={(e) => setCompForm((f) => ({ ...f, compType: e.target.value }))}>
                            {COMP_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                          </select>
                        </div>
                        <div className="form-field full">
                          <label>Kaynak (opsiyonel)</label>
                          <input value={compForm.sourceNote} onChange={(e) => setCompForm((f) => ({ ...f, sourceNote: e.target.value }))} placeholder="Örn: sahibinden.com ilanı, meslektaş bilgisi" />
                        </div>
                      </div>
                      <div className="modal-actions" style={{ marginTop: 10 }}>
                        <button type="submit" className="btn btn-primary" style={{ fontSize: 12 }} disabled={savingComp}>
                          {savingComp ? 'Ekleniyor…' : 'Ekle'}
                        </button>
                      </div>
                    </form>
                  )}

                  {detail.comps.length === 0 ? (
                    <div className="empty-state">Henüz karşılaştırma yok. Otomatik eşleşme bulunamadıysa kendi araştırmanızdan elle ekleyin.</div>
                  ) : (
                    detail.comps.map((c) => (
                      <div key={c.id} className="ledger-history-item" style={{ flexWrap: 'wrap' }}>
                        <span style={{ flex: 1, minWidth: 160 }}>
                          {c.title}
                          {c.isAutoMatched && <span style={{ fontSize: 10, color: 'var(--muted)', marginLeft: 6 }}>(otomatik)</span>}
                        </span>
                        <span style={{ fontSize: 12, color: 'var(--muted)' }}>{c.areaM2 || '—'} m² · {c.rooms || '—'}</span>
                        <input
                          type="number"
                          defaultValue={c.price}
                          onBlur={(e) => {
                            const val = Number(e.target.value);
                            if (val !== Number(c.price)) handleUpdateCompField(c.id, 'price', val);
                          }}
                          style={{ width: 100, fontSize: 12 }}
                        />
                        <span style={{ fontSize: 11, color: 'var(--muted)' }}>{COMP_TYPES.find((t) => t.value === c.compType)?.label}</span>
                        <button type="button" className="task-row__delete" onClick={() => handleRemoveComp(c.id)} title="Sil">✕</button>
                      </div>
                    ))
                  )}

                  <h4 style={{ fontFamily: 'var(--font-display)', marginTop: 20 }}>Sonuç</h4>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 10 }}>
                    <div className="form-field" style={{ margin: 0 }}>
                      <label>Min Değer</label>
                      <input
                        type="number"
                        defaultValue={detail.valuation.estimatedValueMin || ''}
                        onBlur={(e) => handleSaveValuationField('estimatedValueMin', e.target.value ? Number(e.target.value) : null)}
                        style={{ width: 130 }}
                      />
                    </div>
                    <div className="form-field" style={{ margin: 0 }}>
                      <label>Max Değer</label>
                      <input
                        type="number"
                        defaultValue={detail.valuation.estimatedValueMax || ''}
                        onBlur={(e) => handleSaveValuationField('estimatedValueMax', e.target.value ? Number(e.target.value) : null)}
                        style={{ width: 130 }}
                      />
                    </div>
                    <div className="form-field" style={{ margin: 0 }}>
                      <label>Durum</label>
                      <select
                        defaultValue={detail.valuation.status}
                        onChange={(e) => handleSaveValuationField('status', e.target.value)}
                      >
                        {VALUATION_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="form-field full">
                    <label>Sonuç Notu (opsiyonel)</label>
                    <textarea
                      defaultValue={detail.valuation.conclusionNotes || ''}
                      onBlur={(e) => handleSaveValuationField('conclusionNotes', e.target.value)}
                      rows={3}
                      style={{ width: '100%' }}
                    />
                  </div>
                  {savingValuation && <p style={{ fontSize: 11, color: 'var(--muted)' }}>Kaydediliyor…</p>}
                </div>

                <div className="modal-actions" style={{ marginTop: 14, justifyContent: 'space-between' }}>
                  <button type="button" className="btn btn-secondary" style={{ color: 'var(--danger)' }} onClick={() => handleDeleteValuation(detail.valuation.id)}>
                    Analizi Sil
                  </button>
                  <button type="button" className="btn btn-primary" disabled={downloadingPdf} onClick={handleDownloadPdf}>
                    {downloadingPdf ? 'Hazırlanıyor…' : '📄 PDF Olarak İndir'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
