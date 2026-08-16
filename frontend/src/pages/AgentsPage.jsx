import { useEffect, useState, useCallback } from 'react';
import { usersApi } from '../api/auth';
import { announcementsApi } from '../api/announcements';

export default function AgentsPage() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [targetDrafts, setTargetDrafts] = useState({});
  const [savingTargetId, setSavingTargetId] = useState(null);
  const [duesDrafts, setDuesDrafts] = useState({});
  const [savingDuesId, setSavingDuesId] = useState(null);

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
    setRecentAnnouncements(announcements.slice(0, 20));
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await usersApi.createAgent(form);
      setForm({ name: '', email: '', password: '' });
      load();
    } catch (err) {
      const message = err?.response?.data?.message ?? 'Danışman oluşturulamadı.';
      setError(Array.isArray(message) ? message.join(', ') : message);
    } finally {
      setSaving(false);
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

  return (
    <div>
      <div className="folder-panel" style={{ marginBottom: 24 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', marginTop: 0 }}>📢 Danışmanlara Duyuru Gönder</h2>
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

      <div className="folder-panel" style={{ marginBottom: 24 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', marginTop: 0 }}>Yeni Danışman Ekle</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-field">
              <label>Ad Soyad</label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </div>
            <div className="form-field">
              <label>E-posta</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                required
              />
            </div>
            <div className="form-field">
              <label>Şifre</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                minLength={6}
                required
              />
            </div>
          </div>
          {error && <div className="form-error">{error}</div>}
          <div className="modal-actions" style={{ justifyContent: 'flex-start', marginTop: 14 }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Ekleniyor…' : '+ Danışman Ekle'}
            </button>
          </div>
        </form>
      </div>

      <div className="folder-panel">
        <h2 style={{ fontFamily: 'var(--font-display)', marginTop: 0 }}>Danışmanlar</h2>
        {loading ? (
          <div className="empty-state">Yükleniyor…</div>
        ) : agents.length === 0 ? (
          <div className="empty-state">Henüz danışman eklenmemiş.</div>
        ) : (
          agents.map((agent) => (
            <div className="record-row" key={agent.id} style={{ flexWrap: 'wrap' }}>
              <span className="record-row__name">{agent.name}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--muted)' }}>
                {agent.email}
              </span>
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
          ))
        )}
      </div>
    </div>
  );
}
