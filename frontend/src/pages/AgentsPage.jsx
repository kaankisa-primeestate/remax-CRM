import { useEffect, useState, useCallback } from 'react';
import { usersApi } from '../api/auth';
import { announcementsApi } from '../api/announcements';
import { uploadFile } from '../api/client';

const AGENT_TABS = [
  { key: 'roster', label: '👥 Danışmanlar' },
  { key: 'add', label: '➕ Yeni Danışman Ekle' },
  { key: 'announce', label: '📢 Duyurular' },
];

// "Yeni Danışman Ekle" şablonundaki 4 sekme (bkz. proje notları) --
// sabit sırayla, formun kendi ic navigasyonu.
const ADD_AGENT_TABS = [
  { key: 'personal', label: '1. Kişisel Bilgiler' },
  { key: 'legal', label: '2. Mali ve Yasal Kayıtlar' },
  { key: 'work', label: '3. Çalışma Modeli & Hakediş' },
  { key: 'academy', label: '4. Akademi & Eğitim' },
];

const COMPANY_TYPES = [
  { value: 'sahis', label: 'Şahıs Şirketi' },
  { value: 'limited', label: 'Ltd. Şti.' },
];

const COMMISSION_SHARE_TYPES = [
  { value: 'rapp', label: 'RAPP (%48)' },
  { value: 'maximum', label: 'MAXIMUM (%80)' },
];

const FIXED_OFFICE_NAME = 'RE/MAX Bostancı';

const emptyForm = {
  // Sekme 1: Kişisel Bilgiler
  name: '', nationalId: '', email: '', phone: '', profilePhotoUrl: '', password: '',
  // Sekme 2: Mali ve Yasal Kayıtlar
  companyType: '', companyName: '', taxOffice: '', taxId: '', mykCertificateNo: '', realEstateLicenseUrl: '',
  // Sekme 3: Çalışma Modeli & Hakediş
  officeName: FIXED_OFFICE_NAME, commissionShareType: '', contractStartDate: '', mentorAgentId: '',
  // Sekme 4: Akademi & Eğitim
  powerStartCompleted: false, powerStartCertificateNo: '', powerStartCertificateDate: '',
  // Ek (şablonda yok, mevcut sistemden korunuyor, opsiyonel)
  address: '', birthDate: '',
};

// Her sekmedeki zorunlu alanları kontrol eder; eksik varsa o sekmenin
// anahtarını + kullanıcıya gösterilecek mesajı döner.
function validateAgentForm(form) {
  const errors = [];
  if (!form.name.trim()) errors.push({ tab: 'personal', message: 'Ad Soyad zorunludur' });
  if (!/^\d{11}$/.test(form.nationalId)) errors.push({ tab: 'personal', message: 'T.C. Kimlik No 11 haneli olmalıdır' });
  if (!form.email.trim()) errors.push({ tab: 'personal', message: 'Kurumsal e-posta zorunludur' });
  if (!form.phone.trim()) errors.push({ tab: 'personal', message: 'Cep telefonu zorunludur' });
  if (!form.profilePhotoUrl) errors.push({ tab: 'personal', message: 'Profil fotoğrafı zorunludur' });
  if (!form.password || form.password.length < 6) errors.push({ tab: 'personal', message: 'Şifre en az 6 karakter olmalıdır' });

  if (!form.companyType) errors.push({ tab: 'legal', message: 'Şirket türü seçin' });
  if (!form.companyName.trim()) errors.push({ tab: 'legal', message: 'Şirket unvanı zorunludur' });
  if (!form.taxOffice.trim()) errors.push({ tab: 'legal', message: 'Vergi dairesi zorunludur' });
  if (!form.taxId.trim()) errors.push({ tab: 'legal', message: 'Vergi kimlik no zorunludur' });
  if (!form.mykCertificateNo.trim()) errors.push({ tab: 'legal', message: 'MYK Seviye 5 belge no zorunludur' });
  if (!form.realEstateLicenseUrl) errors.push({ tab: 'legal', message: 'Taşınmaz Ticareti Yetki Belgesi zorunludur' });

  if (!form.commissionShareType) errors.push({ tab: 'work', message: 'Komisyon paylaşım tipi seçin' });
  if (!form.contractStartDate) errors.push({ tab: 'work', message: 'Sözleşme başlangıç tarihi zorunludur' });

  if (!form.powerStartCompleted) errors.push({ tab: 'academy', message: 'Power Start Eğitimi tamamlandı olarak işaretlenmelidir' });
  if (!form.powerStartCertificateNo.trim()) errors.push({ tab: 'academy', message: 'Sertifika no zorunludur' });
  if (!form.powerStartCertificateDate) errors.push({ tab: 'academy', message: 'Sertifika tarihi zorunludur' });

  return errors;
}

export default function AgentsPage() {
  const [activeTab, setActiveTab] = useState('roster');
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [addAgentTab, setAddAgentTab] = useState('personal');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingLicense, setUploadingLicense] = useState(false);
  const [targetDrafts, setTargetDrafts] = useState({});
  const [savingTargetId, setSavingTargetId] = useState(null);
  const [duesDrafts, setDuesDrafts] = useState({});
  const [savingDuesId, setSavingDuesId] = useState(null);
  const [profileDrafts, setProfileDrafts] = useState({});
  const [savingProfileId, setSavingProfileId] = useState(null);

  const [announceTitle, setAnnounceTitle] = useState('');
  const [announceMessage, setAnnounceMessage] = useState('');
  const [announceType, setAnnounceType] = useState('general');
  const [sendToAll, setSendToAll] = useState(true);
  const [selectedAgentIds, setSelectedAgentIds] = useState([]);
  const [announceSaving, setAnnounceSaving] = useState(false);
  const [recentAnnouncements, setRecentAnnouncements] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    const [data, announcements] = await Promise.all([
      usersApi.listAgents(),
      announcementsApi.list().catch(() => []),
    ]);
    setAgents(data);
    setTargetDrafts(
      Object.fromEntries(data.map((a) => [a.id, a.monthlyTarget != null ? String(a.monthlyTarget) : ''])),
    );
    setDuesDrafts(
      Object.fromEntries(data.map((a) => [a.id, a.monthlyDuesAmount != null ? String(a.monthlyDuesAmount) : ''])),
    );
    setProfileDrafts(
      Object.fromEntries(data.map((a) => [a.id, {
        companyName: a.companyName || '',
        taxId: a.taxId || '',
        nationalId: a.nationalId || '',
      }])),
    );
    setRecentAnnouncements(announcements.slice(0, 20));
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    const validationErrors = validateAgentForm(form);
    if (validationErrors.length > 0) {
      // Ilk eksik alanin oldugu sekmeye atla, tum hatalari listele.
      setAddAgentTab(validationErrors[0].tab);
      setError(validationErrors.map((v) => v.message).join(' · '));
      return;
    }
    setSaving(true);
    try {
      await usersApi.createAgent({
        name: form.name.trim(),
        nationalId: form.nationalId,
        email: form.email.trim(),
        phone: form.phone.trim(),
        profilePhotoUrl: form.profilePhotoUrl,
        password: form.password,
        companyType: form.companyType,
        companyName: form.companyName.trim(),
        taxOffice: form.taxOffice.trim(),
        taxId: form.taxId.trim(),
        mykCertificateNo: form.mykCertificateNo.trim(),
        realEstateLicenseUrl: form.realEstateLicenseUrl,
        officeName: form.officeName,
        commissionShareType: form.commissionShareType,
        contractStartDate: form.contractStartDate,
        mentorAgentId: form.mentorAgentId || undefined,
        powerStartCompleted: form.powerStartCompleted,
        powerStartCertificateNo: form.powerStartCertificateNo.trim(),
        powerStartCertificateDate: form.powerStartCertificateDate,
        address: form.address.trim() || undefined,
        birthDate: form.birthDate || undefined,
      });
      setForm(emptyForm);
      setAddAgentTab('personal');
      setActiveTab('roster');
      load();
    } catch (err) {
      const message = err?.response?.data?.message ?? 'Danışman oluşturulamadı.';
      setError(Array.isArray(message) ? message.join(', ') : message);
    } finally {
      setSaving(false);
    }
  }

  function handleCancelAddAgent() {
    setForm(emptyForm);
    setAddAgentTab('personal');
    setError(null);
    setActiveTab('roster');
  }

  async function handlePhotoUpload(file) {
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const url = await uploadFile(file);
      setForm((f) => ({ ...f, profilePhotoUrl: url }));
    } catch {
      alert('Fotoğraf yüklenemedi, tekrar deneyin.');
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleLicenseUpload(file) {
    if (!file) return;
    setUploadingLicense(true);
    try {
      const url = await uploadFile(file);
      setForm((f) => ({ ...f, realEstateLicenseUrl: url }));
    } catch {
      alert('Belge yüklenemedi, tekrar deneyin.');
    } finally {
      setUploadingLicense(false);
    }
  }

  async function handleSendAnnouncement(e) {
    e.preventDefault();
    if (!announceTitle.trim() || !announceMessage.trim()) return;
    if (!sendToAll && selectedAgentIds.length === 0) {
      alert('En az bir danışman seçin, ya da "Tüm Danışmanlara Gönder" seçeneğini işaretleyin.');
      return;
    }
    setAnnounceSaving(true);
    try {
      await announcementsApi.create({
        title: announceTitle.trim(),
        message: announceMessage.trim(),
        type: announceType,
        targetAgentIds: sendToAll ? undefined : selectedAgentIds,
      });
      setAnnounceTitle('');
      setAnnounceMessage('');
      setAnnounceType('general');
      setSendToAll(true);
      setSelectedAgentIds([]);
      load();
    } catch (err) {
      alert('Duyuru gönderilemedi, tekrar deneyin.');
    } finally {
      setAnnounceSaving(false);
    }
  }

  function toggleSelectedAgent(agentId) {
    setSelectedAgentIds((prev) => (prev.includes(agentId) ? prev.filter((id) => id !== agentId) : [...prev, agentId]));
  }

  async function handleDeleteAnnouncement(id) {
    if (!confirm('Bu duyuru silinsin mi?')) return;
    setRecentAnnouncements((prev) => prev.filter((a) => a.id !== id));
    try {
      await announcementsApi.remove(id);
    } catch {
      alert('Duyuru silinemedi, sayfa yenileniyor.');
      load();
    }
  }

  async function handleSaveTarget(agentId) {
    setSavingTargetId(agentId);
    try {
      const raw = targetDrafts[agentId];
      const value = raw === '' ? 0 : Number(raw);
      await usersApi.setMonthlyTarget(agentId, value);
      setAgents((prev) => prev.map((a) => (a.id === agentId ? { ...a, monthlyTarget: value } : a)));
    } catch (err) {
      alert('Hedef kaydedilemedi, tekrar deneyin.');
    } finally {
      setSavingTargetId(null);
    }
  }

  async function handleSaveDues(agentId) {
    setSavingDuesId(agentId);
    try {
      const raw = duesDrafts[agentId];
      const value = raw === '' ? 0 : Number(raw);
      await usersApi.setMonthlyDues(agentId, value);
      setAgents((prev) => prev.map((a) => (a.id === agentId ? { ...a, monthlyDuesAmount: value } : a)));
    } catch (err) {
      alert('Aidat tutarı kaydedilemedi, tekrar deneyin.');
    } finally {
      setSavingDuesId(null);
    }
  }

  async function handleSaveProfile(agentId) {
    setSavingProfileId(agentId);
    try {
      const draft = profileDrafts[agentId];
      const payload = {
        companyName: draft.companyName.trim() || undefined,
        taxId: draft.taxId.trim() || undefined,
        nationalId: draft.nationalId.trim() || undefined,
      };
      await usersApi.updateAgentProfile(agentId, payload);
      setAgents((prev) => prev.map((a) => (a.id === agentId ? { ...a, ...payload } : a)));
    } catch (err) {
      alert('Şirket bilgileri kaydedilemedi, tekrar deneyin.');
    } finally {
      setSavingProfileId(null);
    }
  }

  return (
    <div>
      <h2 className="dossier__name" style={{ marginBottom: 16 }}>Danışman Yönetimi</h2>

      <div className="folder-tabs" style={{ flexWrap: 'wrap' }}>
        {AGENT_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`folder-tab${activeTab === tab.key ? ' active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="finance-tab-content">
      {activeTab === 'roster' && (
      <div className="folder-panel">
        {loading ? (
          <div className="empty-state">Yükleniyor…</div>
        ) : agents.length === 0 ? (
          <div className="empty-state">Henüz danışman eklenmemiş. "Yeni Danışman Ekle" sekmesinden başlayabilirsin.</div>
        ) : (
          agents.map((agent) => (
            <div className="agent-card" key={agent.id}>
              <div className="agent-card__header">
                <div>
                  <div className="agent-card__name">{agent.name}</div>
                  <div className="agent-card__meta">
                    {agent.email}
                    {agent.phone && ` · ${agent.phone}`}
                  </div>
                  {(agent.address || agent.birthDate) && (
                    <div className="agent-card__meta">
                      {agent.address && `📍 ${agent.address}`}
                      {agent.address && agent.birthDate && ' · '}
                      {agent.birthDate && `🎂 ${new Date(agent.birthDate).toLocaleDateString('tr-TR')}`}
                    </div>
                  )}
                  {agent.companyName && (
                    <div className="agent-card__meta">🏢 {agent.companyName}{agent.taxId && ` · VKN: ${agent.taxId}`}</div>
                  )}
                </div>
              </div>
              <div className="agent-card__fields">
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <label style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase' }}>
                    Aylık Hedef (₺)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={targetDrafts[agent.id] ?? ''}
                    onChange={(e) => setTargetDrafts((d) => ({ ...d, [agent.id]: e.target.value }))}
                    style={{ width: 130, padding: '6px 8px', fontSize: 13 }}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '6px 10px', fontSize: 12 }}
                    disabled={savingTargetId === agent.id}
                    onClick={() => handleSaveTarget(agent.id)}
                  >
                    {savingTargetId === agent.id ? '…' : 'Kaydet'}
                  </button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <label style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase' }}>
                    Aylık Aidat (₺)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={duesDrafts[agent.id] ?? ''}
                    onChange={(e) => setDuesDrafts((d) => ({ ...d, [agent.id]: e.target.value }))}
                    style={{ width: 130, padding: '6px 8px', fontSize: 13 }}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '6px 10px', fontSize: 12 }}
                    disabled={savingDuesId === agent.id}
                    onClick={() => handleSaveDues(agent.id)}
                  >
                    {savingDuesId === agent.id ? '…' : 'Kaydet'}
                  </button>
                </div>
              </div>
              <div className="agent-card__company-edit">
                <div className="form-field" style={{ margin: 0 }}>
                  <label style={{ fontSize: 10 }}>Şirket Adı</label>
                  <input
                    value={profileDrafts[agent.id]?.companyName ?? ''}
                    onChange={(e) => setProfileDrafts((d) => ({ ...d, [agent.id]: { ...d[agent.id], companyName: e.target.value } }))}
                    style={{ fontSize: 12, padding: '5px 8px' }}
                  />
                </div>
                <div className="form-field" style={{ margin: 0 }}>
                  <label style={{ fontSize: 10 }}>Vergi Kimlik No</label>
                  <input
                    value={profileDrafts[agent.id]?.taxId ?? ''}
                    onChange={(e) => setProfileDrafts((d) => ({ ...d, [agent.id]: { ...d[agent.id], taxId: e.target.value } }))}
                    style={{ fontSize: 12, padding: '5px 8px' }}
                  />
                </div>
                <div className="form-field" style={{ margin: 0 }}>
                  <label style={{ fontSize: 10 }}>TC Kimlik No</label>
                  <input
                    value={profileDrafts[agent.id]?.nationalId ?? ''}
                    onChange={(e) => setProfileDrafts((d) => ({ ...d, [agent.id]: { ...d[agent.id], nationalId: e.target.value } }))}
                    style={{ fontSize: 12, padding: '5px 8px' }}
                  />
                </div>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: '6px 10px', fontSize: 12, alignSelf: 'flex-end' }}
                  disabled={savingProfileId === agent.id}
                  onClick={() => handleSaveProfile(agent.id)}
                >
                  {savingProfileId === agent.id ? '…' : 'Şirket Bilgilerini Kaydet'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      )}

      {activeTab === 'add' && (
      <div className="folder-panel">
        <h3 style={{ fontFamily: 'var(--font-display)', marginTop: 0 }}>Yeni Danışman Ekle</h3>
        <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: -8, marginBottom: 16 }}>
          Danışmanın giriş bilgilerini, mali/yasal kayıtlarını, çalışma modelini ve eğitim durumunu içeren tam profil kaydı — tüm sekmelerdeki zorunlu alanlar doldurulmadan kaydedilemez.
        </p>

        <div className="folder-tabs" style={{ flexWrap: 'wrap', marginBottom: 0 }}>
          {ADD_AGENT_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`folder-tab${addAgentTab === tab.key ? ' active' : ''}`}
              onClick={() => setAddAgentTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="folder-panel" style={{ borderRadius: '0 8px 8px 8px', marginTop: -1 }}>
          {addAgentTab === 'personal' && (
            <div className="form-grid">
              <div className="form-field">
                <label>Adı Soyadı *</label>
                <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="form-field">
                <label>T.C. Kimlik No *</label>
                <input
                  value={form.nationalId}
                  onChange={(e) => setForm((f) => ({ ...f, nationalId: e.target.value.replace(/\D/g, '') }))}
                  placeholder="11 haneli"
                  maxLength={11}
                />
              </div>
              <div className="form-field">
                <label>Kurumsal E-posta *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="isim@remax.com.tr"
                />
              </div>
              <div className="form-field">
                <label>Cep Telefonu *</label>
                <input
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="+90 5XX XXX XX XX"
                />
              </div>
              <div className="form-field">
                <label>Şifre * (giriş için gerekli)</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  minLength={6}
                />
              </div>
              <div className="form-field">
                <label>Profil Fotoğrafı * (JPG/PNG)</label>
                {form.profilePhotoUrl ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <img src={form.profilePhotoUrl} alt="Profil" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
                    <button type="button" className="btn btn-secondary" style={{ fontSize: 11, padding: '4px 8px' }} onClick={() => setForm((f) => ({ ...f, profilePhotoUrl: '' }))}>
                      Değiştir
                    </button>
                  </div>
                ) : (
                  <label className="btn btn-secondary" style={{ display: 'inline-flex', width: 'fit-content', cursor: 'pointer', fontSize: 12 }}>
                    {uploadingPhoto ? 'Yükleniyor…' : '📷 Fotoğraf Yükle'}
                    <input
                      type="file"
                      accept="image/jpeg,image/png"
                      style={{ display: 'none' }}
                      disabled={uploadingPhoto}
                      onChange={(e) => handlePhotoUpload(e.target.files?.[0])}
                    />
                  </label>
                )}
              </div>
              <div className="form-field full">
                <label>Yerleşik Adres (opsiyonel)</label>
                <input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} placeholder="Mahalle, cadde, ilçe/il" />
              </div>
              <div className="form-field">
                <label>Doğum Tarihi (opsiyonel)</label>
                <input type="date" value={form.birthDate} onChange={(e) => setForm((f) => ({ ...f, birthDate: e.target.value }))} />
              </div>
            </div>
          )}

          {addAgentTab === 'legal' && (
            <div className="form-grid">
              <div className="form-field">
                <label>Şirket Türü *</label>
                <div style={{ display: 'flex', gap: 14, marginTop: 6 }}>
                  {COMPANY_TYPES.map((ct) => (
                    <label key={ct.value} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, fontWeight: 400 }}>
                      <input
                        type="radio"
                        name="companyType"
                        checked={form.companyType === ct.value}
                        onChange={() => setForm((f) => ({ ...f, companyType: ct.value }))}
                      />
                      {ct.label}
                    </label>
                  ))}
                </div>
              </div>
              <div className="form-field">
                <label>Şirket Unvanı *</label>
                <input value={form.companyName} onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))} placeholder="Örn: Hasan Yılmaz Gayrimenkul" />
              </div>
              <div className="form-field">
                <label>Vergi Dairesi *</label>
                <input value={form.taxOffice} onChange={(e) => setForm((f) => ({ ...f, taxOffice: e.target.value }))} placeholder="Örn: Kadıköy Vergi Dairesi" />
              </div>
              <div className="form-field">
                <label>Vergi No *</label>
                <input value={form.taxId} onChange={(e) => setForm((f) => ({ ...f, taxId: e.target.value }))} placeholder="10 haneli" maxLength={10} />
              </div>
              <div className="form-field">
                <label>MYK Seviye 5 Belge No *</label>
                <input value={form.mykCertificateNo} onChange={(e) => setForm((f) => ({ ...f, mykCertificateNo: e.target.value }))} placeholder="Belge kodu" />
              </div>
              <div className="form-field">
                <label>Taşınmaz Ticareti Yetki Belgesi *</label>
                {form.realEstateLicenseUrl ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <a href={form.realEstateLicenseUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12 }}>📎 Belgeyi görüntüle</a>
                    <button type="button" className="btn btn-secondary" style={{ fontSize: 11, padding: '4px 8px' }} onClick={() => setForm((f) => ({ ...f, realEstateLicenseUrl: '' }))}>
                      Değiştir
                    </button>
                  </div>
                ) : (
                  <label className="btn btn-secondary" style={{ display: 'inline-flex', width: 'fit-content', cursor: 'pointer', fontSize: 12 }}>
                    {uploadingLicense ? 'Yükleniyor…' : '📎 Belge Yükle'}
                    <input
                      type="file"
                      style={{ display: 'none' }}
                      disabled={uploadingLicense}
                      onChange={(e) => handleLicenseUpload(e.target.files?.[0])}
                    />
                  </label>
                )}
              </div>
            </div>
          )}

          {addAgentTab === 'work' && (
            <div className="form-grid">
              <div className="form-field">
                <label>Bağlı Olduğu Ofis</label>
                <input value={form.officeName} disabled style={{ opacity: 0.7, cursor: 'not-allowed' }} />
              </div>
              <div className="form-field">
                <label>Komisyon Paylaşım Tipi *</label>
                <div style={{ display: 'flex', gap: 14, marginTop: 6 }}>
                  {COMMISSION_SHARE_TYPES.map((cs) => (
                    <label key={cs.value} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, fontWeight: 400 }}>
                      <input
                        type="radio"
                        name="commissionShareType"
                        checked={form.commissionShareType === cs.value}
                        onChange={() => setForm((f) => ({ ...f, commissionShareType: cs.value }))}
                      />
                      {cs.label}
                    </label>
                  ))}
                </div>
              </div>
              <div className="form-field">
                <label>Sözleşme Başlangıç Tarihi *</label>
                <input type="date" value={form.contractStartDate} onChange={(e) => setForm((f) => ({ ...f, contractStartDate: e.target.value }))} />
              </div>
              <div className="form-field">
                <label>Mentor / Koç (opsiyonel)</label>
                <select value={form.mentorAgentId} onChange={(e) => setForm((f) => ({ ...f, mentorAgentId: e.target.value }))}>
                  <option value="">Seçiniz</option>
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {addAgentTab === 'academy' && (
            <div className="form-grid">
              <div className="form-field full" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  id="powerStartCompleted"
                  checked={form.powerStartCompleted}
                  onChange={(e) => setForm((f) => ({ ...f, powerStartCompleted: e.target.checked }))}
                  style={{ width: 'auto' }}
                />
                <label htmlFor="powerStartCompleted" style={{ margin: 0 }}>Power Start Eğitimi Tamamlandı *</label>
              </div>
              <div className="form-field">
                <label>Sertifika No *</label>
                <input value={form.powerStartCertificateNo} onChange={(e) => setForm((f) => ({ ...f, powerStartCertificateNo: e.target.value }))} />
              </div>
              <div className="form-field">
                <label>Sertifika Tarihi *</label>
                <input type="date" value={form.powerStartCertificateDate} onChange={(e) => setForm((f) => ({ ...f, powerStartCertificateDate: e.target.value }))} />
              </div>
            </div>
          )}

          {error && <div className="form-error">{error}</div>}
          <div className="modal-actions" style={{ justifyContent: 'flex-start', marginTop: 14, gap: 8 }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Kaydediliyor…' : 'Kaydet'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={handleCancelAddAgent}>
              İptal
            </button>
          </div>
        </form>
      </div>
      )}

      {activeTab === 'announce' && (
      <div className="folder-panel">
        <h3 style={{ fontFamily: 'var(--font-display)', marginTop: 0 }}>📢 Danışmanlara Duyuru Gönder</h3>
        <form onSubmit={handleSendAnnouncement}>
          <div className="form-field">
            <label>Başlık</label>
            <input value={announceTitle} onChange={(e) => setAnnounceTitle(e.target.value)} placeholder="Örn: Pazartesi Toplantısı" />
          </div>
          <div className="form-field">
            <label>Mesaj</label>
            <textarea rows={3} value={announceMessage} onChange={(e) => setAnnounceMessage(e.target.value)} placeholder="Örn: 16'sında saat 10:00'da ofiste toplantımız var, lütfen katılın." />
          </div>
          <div className="form-field full" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" checked={announceType === 'celebration'} onChange={(e) => setAnnounceType(e.target.checked ? 'celebration' : 'general')} style={{ width: 'auto' }} />
            <label style={{ textTransform: 'none', fontFamily: 'var(--font-body)', fontSize: 14 }}>
              🎉 Kutlama Mesajı (doğum günü, satış/kiralama tebriği vb. — özel görsel efektle gösterilir)
            </label>
          </div>
          <div className="form-field full" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" checked={sendToAll} onChange={(e) => setSendToAll(e.target.checked)} style={{ width: 'auto' }} />
            <label style={{ textTransform: 'none', fontFamily: 'var(--font-body)', fontSize: 14 }}>Tüm Danışmanlara Gönder</label>
          </div>
          {!sendToAll && (
            <div className="announce-agent-picker">
              {agents.map((agent) => (
                <label key={agent.id} className="announce-agent-picker__item">
                  <input
                    type="checkbox"
                    checked={selectedAgentIds.includes(agent.id)}
                    onChange={() => toggleSelectedAgent(agent.id)}
                  />
                  {agent.name}
                </label>
              ))}
            </div>
          )}
          <div className="modal-actions" style={{ justifyContent: 'flex-start', marginTop: 14 }}>
            <button type="submit" className="btn btn-primary" disabled={announceSaving || !announceTitle.trim() || !announceMessage.trim()}>
              {announceSaving ? 'Gönderiliyor…' : 'Duyuruyu Gönder'}
            </button>
          </div>
        </form>

        {recentAnnouncements.length > 0 && (
          <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px dashed var(--paper-line)' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 14, marginTop: 0 }}>Gönderilen Duyurular</h3>
            <div className="announce-sent-scroll">
              {recentAnnouncements.map((a) => (
                <div key={a.id} className="announce-sent-item-wrapper">
                  <div className="announce-sent-item">
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{a.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                        {a.targetAgentIds?.length ? `${a.targetAgentIds.length} danışmana` : 'Tüm danışmanlara'} · {new Date(a.createdAt).toLocaleDateString('tr-TR')}
                        {a.responseCounts && (a.responseCounts.yes > 0 || a.responseCounts.no > 0) && (
                          <> · <span style={{ color: 'var(--success)' }}>✓ {a.responseCounts.yes}</span> <span style={{ color: 'var(--danger)' }}>✕ {a.responseCounts.no}</span></>
                        )}
                      </div>
                    </div>
                    <button type="button" className="task-row__delete" onClick={() => handleDeleteAnnouncement(a.id)} title="Sil">✕</button>
                  </div>
                  {a.responses?.length > 0 && (
                    <div className="announce-response-list">
                      {a.responses.map((r) => (
                        <span key={r.agentId} className={`announce-response-chip announce-response-chip--${r.status}`}>
                          {r.status === 'yes' ? '✓' : '✕'} {r.agentName}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      )}
      </div>
    </div>
  );
}
