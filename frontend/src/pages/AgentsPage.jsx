import { useEffect, useState, useCallback } from 'react';
import { usersApi } from '../api/auth';

export default function AgentsPage() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [targetDrafts, setTargetDrafts] = useState({});
  const [savingTargetId, setSavingTargetId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await usersApi.listAgents();
    setAgents(data);
    setTargetDrafts(
      Object.fromEntries(data.map((a) => [a.id, a.monthlyTarget != null ? String(a.monthlyTarget) : ''])),
    );
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

  return (
    <div>
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
            </div>
          ))
        )}
      </div>
    </div>
  );
}
