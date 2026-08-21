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
  { value: 'rapp', label: 'RAPP', defaultPct: 48 },
  { value: 'maximum', label: 'MAXIMUM', defaultPct: 80 },
];

const FIXED_OFFICE_NAME = 'RE/MAX Bostancı';

const emptyForm = {
  // Sekme 1: Kişisel Bilgiler
  name: '', nationalId: '', email: '', phone: '', profilePhotoUrl: '', password: '',
  // Sekme 2: Mali ve Yasal Kayıtlar
  companyType: '', companyName: '', taxOffice: '', taxId: '', mykCertificateNo: '', realEstateLicenseUrl: '',
  // Sekme 3: Çalışma Modeli & Hakediş
  officeName: FIXED_OFFICE_NAME, commissionShareType: '', commissionSharePercentage: '', tierCommissionRules: [], contractStartDate: '', mentorAgentId: '', monthlyDuesAmount: '',
  // Sekme 4: Akademi & Eğitim
  powerStartCompleted: false, powerStartCertificateNo: '', powerStartCertificateDate: '',
  // Ek (şablonda yok, mevcut sistemden korunuyor, opsiyonel)
  address: '', birthDate: '',
};

// Her sekmedeki zorunlu alanları kontrol eder; eksik varsa o sekmenin
// anahtarını + kullanıcıya gösterilecek mesajı döner.
// HIZLI KAYIT: sadece Ad Soyad, Kurumsal E-posta, Cep Telefonu ve Sifre
// zorunlu -- geri kalan tum alanlar (T.C. Kimlik No, Profil Fotografi,
// Mali/Yasal, Calisma Modeli, Akademi) opsiyonel, Broker daha sonra
// "Duzenle"den tamamlar (bkz. backend create-agent.dto.ts, ayni gevseme).
function validateAgentForm(form) {
  const errors = [];
  if (!form.name.trim()) errors.push({ tab: 'personal', message: 'Ad Soyad zorunludur' });
  if (!form.email.trim()) errors.push({ tab: 'personal', message: 'Kurumsal e-posta zorunludur' });
  if (!form.phone.trim()) errors.push({ tab: 'personal', message: 'Cep telefonu zorunludur' });
  if (!form.password || form.password.length < 6) errors.push({ tab: 'personal', message: 'Şifre en az 6 karakter olmalıdır' });
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
  const [editingAgentId, setEditingAgentId] = useState(null); // null = yeni ekleme, doluysa duzenleme modu
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
  const [readStatusOpenId, setReadStatusOpenId] = useState(null); // hangi duyurunun "kim okudu" raporu acik
  const [readStatusById, setReadStatusById] = useState({});
  const [readStatusLoading, setReadStatusLoading] = useState(false);

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

    if (editingAgentId) {
      // Duzenleme modu: sablon zorunluluklari uygulanmaz -- eski
      // danismanlarin cogu alani bos olabilir, sadece doldurulan
      // alanlar guncellenir (kismi guncelleme).
      setSaving(true);
      try {
        const payload = {};
        const maybe = (key, value) => {
          if (value !== '' && value !== null && value !== undefined) payload[key] = value;
        };
        maybe('phone', form.phone.trim());
        maybe('address', form.address.trim());
        maybe('birthDate', form.birthDate);
        maybe('nationalId', form.nationalId.trim());
        maybe('profilePhotoUrl', form.profilePhotoUrl);
        maybe('companyType', form.companyType);
        maybe('companyName', form.companyName.trim());
        maybe('taxOffice', form.taxOffice.trim());
        maybe('taxId', form.taxId.trim());
        maybe('mykCertificateNo', form.mykCertificateNo.trim());
        maybe('realEstateLicenseUrl', form.realEstateLicenseUrl);
        maybe('officeName', form.officeName);
        maybe('commissionShareType', form.commissionShareType);
        if (form.commissionSharePercentage !== '' && !Number.isNaN(Number(form.commissionSharePercentage))) {
          payload.commissionSharePercentage = Number(form.commissionSharePercentage);
        }
        if (form.tierCommissionRules.length > 0) {
          payload.tierCommissionRules = form.tierCommissionRules
            .filter((r) => r.threshold !== '' && r.rate !== '')
            .map((r) => ({ threshold: Number(r.threshold), rate: Number(r.rate) }));
        }
        maybe('contractStartDate', form.contractStartDate);
        // mentorAgentId ozel durum: diger alanlardan farkli olarak, bos
        // birakilip kaydedilmesi "mentoru kaldir" anlamina gelmeli -- bu
        // yuzden "maybe" ile atlanmiyor, her zaman acikca gonderiliyor
        // (ya secilen id, ya da null).
        payload.mentorAgentId = form.mentorAgentId || null;
        payload.powerStartCompleted = form.powerStartCompleted;
        maybe('powerStartCertificateNo', form.powerStartCertificateNo.trim());
        maybe('powerStartCertificateDate', form.powerStartCertificateDate);

        const updated = await usersApi.updateAgentProfile(editingAgentId, payload);
        setAgents((prev) => prev.map((a) => (a.id === editingAgentId ? { ...a, ...updated } : a)));
        setForm(emptyForm);
        setAddAgentTab('personal');
        setEditingAgentId(null);
        setActiveTab('roster');
      } catch (err) {
        const message = err?.response?.data?.message ?? 'Danışman güncellenemedi.';
        setError(Array.isArray(message) ? message.join(', ') : message);
      } finally {
        setSaving(false);
      }
      return;
    }

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
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password,
        nationalId: form.nationalId.trim() || undefined,
        profilePhotoUrl: form.profilePhotoUrl || undefined,
        companyType: form.companyType || undefined,
        companyName: form.companyName.trim() || undefined,
        taxOffice: form.taxOffice.trim() || undefined,
        taxId: form.taxId.trim() || undefined,
        mykCertificateNo: form.mykCertificateNo.trim() || undefined,
        realEstateLicenseUrl: form.realEstateLicenseUrl || undefined,
        officeName: form.officeName || undefined,
        commissionShareType: form.commissionShareType || undefined,
        commissionSharePercentage: form.commissionSharePercentage !== '' ? Number(form.commissionSharePercentage) : undefined,
        contractStartDate: form.contractStartDate || undefined,
        mentorAgentId: form.mentorAgentId || undefined,
        monthlyDuesAmount: form.monthlyDuesAmount !== '' ? Number(form.monthlyDuesAmount) : undefined,
        powerStartCompleted: form.powerStartCompleted || undefined,
        powerStartCertificateNo: form.powerStartCertificateNo.trim() || undefined,
        powerStartCertificateDate: form.powerStartCertificateDate || undefined,
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

  // Danışman kartındaki "Düzenle" butonuna basılınca çağrılır -- aynı
  // formu, mevcut degerlerle onceden doldurulmus sekilde acar.
  function handleEditAgent(agent) {
    setForm({
      name: agent.name || '',
      nationalId: agent.nationalId || '',
      email: agent.email || '',
      phone: agent.phone || '',
      profilePhotoUrl: agent.profilePhotoUrl || '',
      password: '',
      companyType: agent.companyType || '',
      companyName: agent.companyName || '',
      taxOffice: agent.taxOffice || '',
      taxId: agent.taxId || '',
      mykCertificateNo: agent.mykCertificateNo || '',
      realEstateLicenseUrl: agent.realEstateLicenseUrl || '',
      officeName: agent.officeName || FIXED_OFFICE_NAME,
      commissionShareType: agent.commissionShareType || '',
      commissionSharePercentage: agent.commissionSharePercentage != null ? String(agent.commissionSharePercentage) : '',
      tierCommissionRules: (agent.tierCommissionRules || []).map((r) => ({ threshold: String(r.threshold), rate: String(r.rate) })),
      contractStartDate: agent.contractStartDate ? agent.contractStartDate.slice(0, 10) : '',
      mentorAgentId: agent.mentorAgentId || '',
      monthlyDuesAmount: agent.monthlyDuesAmount != null ? String(agent.monthlyDuesAmount) : '',
      powerStartCompleted: !!agent.powerStartCompleted,
      powerStartCertificateNo: agent.powerStartCertificateNo || '',
      powerStartCertificateDate: agent.powerStartCertificateDate ? agent.powerStartCertificateDate.slice(0, 10) : '',
      address: agent.address || '',
      birthDate: agent.birthDate ? agent.birthDate.slice(0, 10) : '',
    });
    setEditingAgentId(agent.id);
    setAddAgentTab('personal');
    setError(null);
    setActiveTab('add');
  }

  function handleCancelAddAgent() {
    setForm(emptyForm);
    setAddAgentTab('personal');
    setEditingAgentId(null);
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

  // "Kim Okudu?" raporunu ac/kapat -- ilk acilista arka uctan ceker,
  // sonraki acilislarda cache'den gosterir (tekrar tekrar sorgu atmasin).
  // "Kim Okudu?" raporunu ac/kapat -- HER acilista guncel veri ceker
  // (onbellek TUTMUYORUZ kasti olarak -- danisman az once okumus/kapatmis
  // olabilir, Broker'in eski/bayat bir durum gormesi yanlis bilgi verir).
  async function handleToggleReadStatus(announcementId) {
    if (readStatusOpenId === announcementId) {
      setReadStatusOpenId(null);
      return;
    }
    setReadStatusOpenId(announcementId);
    setReadStatusLoading(true);
    try {
      const data = await announcementsApi.getReadStatus(announcementId);
      setReadStatusById((prev) => ({ ...prev, [announcementId]: data }));
    } catch {
      alert('Okuma durumu alınamadı, tekrar deneyin.');
      setReadStatusOpenId(null);
    } finally {
      setReadStatusLoading(false);
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
                {agent.profilePhotoUrl && (
                  <img
                    src={agent.profilePhotoUrl}
                    alt={agent.name}
                    style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                  />
                )}
                <div style={{ flex: 1 }}>
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
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ fontSize: 12, padding: '6px 12px', flexShrink: 0 }}
                  onClick={() => handleEditAgent(agent)}
                >
                  ✏️ Düzenle
                </button>
              </div>

              {/* Mali/Yasal, Calisma Modeli ve Akademi bilgileri + belge linkleri --
                  "Yeni Danisman Ekle" formunda toplanan bilgilerin geri
                  gorulebilecegi tek yer burasi. */}
              {(agent.companyType || agent.mykCertificateNo || agent.realEstateLicenseUrl || agent.commissionShareType || agent.contractStartDate || agent.mentorAgentId || agent.powerStartCompleted) && (
                <div className="agent-card__profile-info">
                  {(agent.companyType || agent.taxOffice || agent.mykCertificateNo || agent.realEstateLicenseUrl) && (
                    <div className="agent-card__info-group">
                      <div className="agent-card__info-title">Mali ve Yasal</div>
                      <div className="agent-card__info-text">
                        {agent.companyType && (COMPANY_TYPES.find((c) => c.value === agent.companyType)?.label || agent.companyType)}
                        {agent.taxOffice && ` · ${agent.taxOffice}`}
                        {agent.mykCertificateNo && ` · MYK: ${agent.mykCertificateNo}`}
                      </div>
                      {agent.realEstateLicenseUrl && (
                        <a href={agent.realEstateLicenseUrl} target="_blank" rel="noreferrer" className="agent-card__doc-link">
                          📎 Taşınmaz Ticareti Yetki Belgesi
                        </a>
                      )}
                    </div>
                  )}
                  {(agent.officeName || agent.commissionShareType || agent.contractStartDate || agent.mentorAgentId) && (
                    <div className="agent-card__info-group">
                      <div className="agent-card__info-title">Çalışma Modeli</div>
                      <div className="agent-card__info-text">
                        {agent.officeName}
                        {agent.commissionShareType && ` · ${COMMISSION_SHARE_TYPES.find((c) => c.value === agent.commissionShareType)?.label || agent.commissionShareType}`}
                        {agent.commissionSharePercentage != null && ` (%${agent.commissionSharePercentage})`}
                        {agent.contractStartDate && ` · Sözleşme: ${new Date(agent.contractStartDate).toLocaleDateString('tr-TR')}`}
                        {agent.mentorAgentId && ` · Mentor: ${agents.find((a) => a.id === agent.mentorAgentId)?.name || '—'}`}
                      </div>
                    </div>
                  )}
                  {(agent.powerStartCompleted || agent.powerStartCertificateNo) && (
                    <div className="agent-card__info-group">
                      <div className="agent-card__info-title">Akademi</div>
                      <div className="agent-card__info-text">
                        {agent.powerStartCompleted ? '✅ Power Start Tamamlandı' : '⬜ Power Start Tamamlanmadı'}
                        {agent.powerStartCertificateNo && ` · Sertifika No: ${agent.powerStartCertificateNo}`}
                        {agent.powerStartCertificateDate && ` · ${new Date(agent.powerStartCertificateDate).toLocaleDateString('tr-TR')}`}
                      </div>
                    </div>
                  )}
                </div>
              )}
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
        <h3 style={{ fontFamily: 'var(--font-display)', marginTop: 0 }}>
          {editingAgentId ? `Danışmanı Düzenle: ${form.name}` : 'Yeni Danışman Ekle'}
        </h3>
        <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: -8, marginBottom: 16 }}>
          {editingAgentId
            ? 'Değiştirmek istediğin alanları güncelle ve kaydet — boş bıraktığın alanlar mevcut kayıtlı değerleriyle korunur.'
            : 'Hızlı kayıt: sadece Ad Soyad, Kurumsal E-posta, Cep Telefonu ve Şifre zorunlu — diğer tüm bilgileri (kimlik, mali/yasal, çalışma modeli, akademi) daha sonra "Düzenle" ekranından tamamlayabilirsiniz.'}
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
                <label>Adı Soyadı {!editingAgentId && '*'}</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  disabled={!!editingAgentId}
                  style={editingAgentId ? { opacity: 0.7, cursor: 'not-allowed' } : undefined}
                />
              </div>
              <div className="form-field">
                <label>T.C. Kimlik No (opsiyonel)</label>
                <input
                  value={form.nationalId}
                  onChange={(e) => setForm((f) => ({ ...f, nationalId: e.target.value.replace(/\D/g, '') }))}
                  placeholder="11 haneli"
                  maxLength={11}
                />
              </div>
              <div className="form-field">
                <label>Kurumsal E-posta {!editingAgentId && '*'}</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="isim@remax.com.tr"
                  disabled={!!editingAgentId}
                  style={editingAgentId ? { opacity: 0.7, cursor: 'not-allowed' } : undefined}
                />
                {editingAgentId && (
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>E-posta değişikliği için ayrı bir işlem gerekir.</span>
                )}
              </div>
              <div className="form-field">
                <label>Cep Telefonu {!editingAgentId && '*'}</label>
                <input
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="+90 5XX XXX XX XX"
                />
              </div>
              {!editingAgentId && (
                <div className="form-field">
                  <label>Şifre * (giriş için gerekli)</label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    minLength={6}
                  />
                </div>
              )}
              <div className="form-field">
                <label>Profil Fotoğrafı (opsiyonel, JPG/PNG)</label>
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
                <label>Şirket Türü (opsiyonel)</label>
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
                <label>Şirket Unvanı (opsiyonel)</label>
                <input value={form.companyName} onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))} placeholder="Örn: Hasan Yılmaz Gayrimenkul" />
              </div>
              <div className="form-field">
                <label>Vergi Dairesi (opsiyonel)</label>
                <input value={form.taxOffice} onChange={(e) => setForm((f) => ({ ...f, taxOffice: e.target.value }))} placeholder="Örn: Kadıköy Vergi Dairesi" />
              </div>
              <div className="form-field">
                <label>Vergi No (opsiyonel)</label>
                <input value={form.taxId} onChange={(e) => setForm((f) => ({ ...f, taxId: e.target.value }))} placeholder="10 haneli" maxLength={10} />
              </div>
              <div className="form-field">
                <label>MYK Seviye 5 Belge No (opsiyonel)</label>
                <input value={form.mykCertificateNo} onChange={(e) => setForm((f) => ({ ...f, mykCertificateNo: e.target.value }))} placeholder="Belge kodu" />
              </div>
              <div className="form-field">
                <label>Taşınmaz Ticareti Yetki Belgesi (opsiyonel)</label>
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
                <label>Aylık Ofis Aidatı (opsiyonel)</label>
                <input
                  type="number"
                  min="0"
                  value={form.monthlyDuesAmount}
                  onChange={(e) => setForm((f) => ({ ...f, monthlyDuesAmount: e.target.value }))}
                  placeholder="Örn: 2500"
                />
              </div>
              <div className="form-field full">
                <label>Komisyon Paylaşım Tipi (opsiyonel)</label>
                <div style={{ display: 'flex', gap: 18, marginTop: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                  {COMMISSION_SHARE_TYPES.map((cs) => (
                    <label key={cs.value} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, fontWeight: 400 }}>
                      <input
                        type="radio"
                        name="commissionShareType"
                        checked={form.commissionShareType === cs.value}
                        onChange={() =>
                          setForm((f) => ({
                            ...f,
                            commissionShareType: cs.value,
                            // Tipi degistirince varsayilan yuzdeyi onerir, ama
                            // kullanici zaten elle bir sey girmisse (farkli
                            // bir tipten geliyorsa) onu korur -- degistirme
                            // anindaki en dogru davranis varsayilani onermek.
                            commissionSharePercentage: String(cs.defaultPct),
                          }))
                        }
                      />
                      {cs.label} (varsayılan %{cs.defaultPct})
                    </label>
                  ))}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>Anlaşılan oran:</span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={form.commissionSharePercentage}
                      onChange={(e) => setForm((f) => ({ ...f, commissionSharePercentage: e.target.value }))}
                      style={{ width: 70 }}
                      disabled={!form.commissionShareType}
                    />
                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>%</span>
                  </div>
                </div>
                <p style={{ fontSize: 11, color: 'var(--muted)', margin: '4px 0 0' }}>
                  Tip seçince oran otomatik önerilir, farklı anlaşıldıysa (örn. MAXIMUM ama %75) üzerine tıklayıp değiştirebilirsiniz.
                </p>
              </div>

              {editingAgentId && (
                <div className="form-field full">
                  <label>Kademeli Prim (opsiyonel — yıllık ciroya göre otomatik oran önerisi)</label>
                  <p style={{ fontSize: 11, color: 'var(--muted)', margin: '2px 0 8px' }}>
                    Örn: "0 TL üzeri %50, 500.000 TL üzeri %60" gibi eşikler tanımlarsan, komisyon oluştururken sistem danışmanın o yılki toplam cirosuna göre otomatik bir oran önerir (yine de elle değiştirilebilir).
                  </p>
                  {form.tierCommissionRules.map((rule, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontSize: 12, color: 'var(--muted)' }}>Eşik (TL):</span>
                      <input
                        type="number"
                        min="0"
                        value={rule.threshold}
                        onChange={(e) => {
                          const next = [...form.tierCommissionRules];
                          next[i] = { ...next[i], threshold: e.target.value };
                          setForm((f) => ({ ...f, tierCommissionRules: next }));
                        }}
                        style={{ width: 110 }}
                      />
                      <span style={{ fontSize: 12, color: 'var(--muted)' }}>üzeri oran %:</span>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={rule.rate}
                        onChange={(e) => {
                          const next = [...form.tierCommissionRules];
                          next[i] = { ...next[i], rate: e.target.value };
                          setForm((f) => ({ ...f, tierCommissionRules: next }));
                        }}
                        style={{ width: 70 }}
                      />
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ fontSize: 11, padding: '3px 8px' }}
                        onClick={() => setForm((f) => ({ ...f, tierCommissionRules: f.tierCommissionRules.filter((_, idx) => idx !== i) }))}
                      >
                        Kaldır
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ fontSize: 11, padding: '4px 10px' }}
                    onClick={() => setForm((f) => ({ ...f, tierCommissionRules: [...f.tierCommissionRules, { threshold: '', rate: '' }] }))}
                  >
                    + Kademe Ekle
                  </button>
                </div>
              )}
              <div className="form-field">
                <label>Sözleşme Başlangıç Tarihi (opsiyonel)</label>
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
                <label htmlFor="powerStartCompleted" style={{ margin: 0 }}>Power Start Eğitimi Tamamlandı (opsiyonel)</label>
              </div>
              <div className="form-field">
                <label>Sertifika No (opsiyonel)</label>
                <input value={form.powerStartCertificateNo} onChange={(e) => setForm((f) => ({ ...f, powerStartCertificateNo: e.target.value }))} />
              </div>
              <div className="form-field">
                <label>Sertifika Tarihi (opsiyonel)</label>
                <input type="date" value={form.powerStartCertificateDate} onChange={(e) => setForm((f) => ({ ...f, powerStartCertificateDate: e.target.value }))} />
              </div>
            </div>
          )}

          {error && <div className="form-error">{error}</div>}
          <div className="modal-actions" style={{ justifyContent: 'flex-start', marginTop: 14, gap: 8 }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Kaydediliyor…' : editingAgentId ? 'Değişiklikleri Kaydet' : 'Kaydet'}
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
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ fontSize: 11, padding: '3px 10px', marginTop: 6 }}
                    onClick={() => handleToggleReadStatus(a.id)}
                  >
                    {readStatusOpenId === a.id ? '▲' : '▼'} 👁 Kim Okudu?
                  </button>
                  {readStatusOpenId === a.id && (
                    <div style={{ marginTop: 8, padding: '8px 10px', background: 'var(--paper)', borderRadius: 6 }}>
                      {readStatusLoading ? (
                        <span style={{ fontSize: 12, color: 'var(--muted)' }}>Yükleniyor…</span>
                      ) : (
                        (readStatusById[a.id] || []).map((r) => (
                          <div key={r.agentId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '3px 0' }}>
                            <span>{r.agentName}</span>
                            <span style={{ color: r.dismissedAt ? '#1e7a3d' : r.readAt ? '#8a6100' : 'var(--muted)' }}>
                              {r.dismissedAt
                                ? `✓ Okudu ve kapattı (${new Date(r.dismissedAt).toLocaleDateString('tr-TR')})`
                                : r.readAt
                                  ? `👁 Sadece okudu (${new Date(r.readAt).toLocaleDateString('tr-TR')})`
                                  : '— Henüz görmedi'}
                            </span>
                          </div>
                        ))
                      )}
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
