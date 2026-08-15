import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { appointmentsApi, APPOINTMENT_TYPES } from '../api/appointments';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function formatDateLabel(dateStr) {
  const date = new Date(dateStr);
  const today = todayStr();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);

  if (dateStr === today) return 'Bugün';
  if (dateStr === tomorrowStr) return 'Yarın';
  return date.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' });
}

export default function CalendarPage() {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPast, setShowPast] = useState(false);

  const [title, setTitle] = useState('');
  const [date, setDate] = useState(todayStr());
  const [time, setTime] = useState('');
  const [type, setType] = useState('meeting');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await appointmentsApi.list();
    setAppointments(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAdd(e) {
    e.preventDefault();
    if (!title.trim() || !date) return;
    setSaving(true);
    try {
      await appointmentsApi.create({ title: title.trim(), date, time: time || undefined, type });
      setTitle('');
      setTime('');
      load();
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleComplete(appt) {
    setAppointments((prev) => prev.map((a) => (a.id === appt.id ? { ...a, completed: !a.completed } : a)));
    try {
      await appointmentsApi.update(appt.id, { completed: !appt.completed });
    } catch {
      setAppointments((prev) => prev.map((a) => (a.id === appt.id ? { ...a, completed: appt.completed } : a)));
      alert('Randevu güncellenemedi, tekrar deneyin.');
    }
  }

  async function handleDelete(id) {
    if (!confirm('Bu randevu silinsin mi?')) return;
    setAppointments((prev) => prev.filter((a) => a.id !== id));
    try {
      await appointmentsApi.remove(id);
    } catch {
      alert('Randevu silinemedi, sayfa yenileniyor.');
      load();
    }
  }

  const today = todayStr();
  const visible = appointments.filter((a) => showPast || a.date >= today);

  // Tarihe gore grupla (ayni gundeki randevular tek baslik altinda)
  const grouped = [];
  for (const appt of visible) {
    let group = grouped.find((g) => g.date === appt.date);
    if (!group) {
      group = { date: appt.date, items: [] };
      grouped.push(group);
    }
    group.items.push(appt);
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => navigate(-1)}
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
          color: 'var(--muted)',
          background: 'transparent',
          border: 'none',
          padding: 0,
          marginBottom: 12,
          cursor: 'pointer',
          display: 'block',
        }}
      >
        ← Geri Dön
      </button>
      <h2 className="dossier__name" style={{ marginBottom: 16 }}>Takvim</h2>

      <div className="folder-panel" style={{ marginBottom: 20 }}>
        <form onSubmit={handleAdd} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-field" style={{ flex: 1, minWidth: 180, margin: 0 }}>
            <label>Başlık</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Örn: Ahmet Bey ile görüşme" />
          </div>
          <div className="form-field" style={{ margin: 0 }}>
            <label>Tarih</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="form-field" style={{ margin: 0 }}>
            <label>Saat (opsiyonel)</label>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
          <div className="form-field" style={{ margin: 0 }}>
            <label>Tür</label>
            <select value={type} onChange={(e) => setType(e.target.value)}>
              {APPOINTMENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn btn-primary" disabled={saving || !title.trim()}>
            {saving ? 'Ekleniyor…' : '+ Ekle'}
          </button>
        </form>
      </div>

      <div className="folder-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', margin: 0, fontSize: 16 }}>Ajanda</h3>
          <button type="button" className="btn btn-secondary" style={{ fontSize: 12, padding: '6px 12px' }} onClick={() => setShowPast((v) => !v)}>
            {showPast ? 'Sadece Yaklaşanları Göster' : 'Geçmişi de Göster'}
          </button>
        </div>

        {loading ? (
          <div className="empty-state">Yükleniyor…</div>
        ) : grouped.length === 0 ? (
          <div className="empty-state">Yaklaşan randevu yok.</div>
        ) : (
          grouped.map((group) => (
            <div key={group.date} className="agenda-group">
              <div className="agenda-group__date">{formatDateLabel(group.date)}</div>
              {group.items.map((appt) => {
                const typeInfo = APPOINTMENT_TYPES.find((t) => t.value === appt.type);
                return (
                  <div key={appt.id} className="task-row">
                    <label className="task-row__checkbox">
                      <input type="checkbox" checked={appt.completed} onChange={() => handleToggleComplete(appt)} />
                    </label>
                    <div className="task-row__body">
                      <div className={`task-row__title${appt.completed ? ' is-completed' : ''}`}>
                        {typeInfo?.icon} {appt.title}
                      </div>
                      <div className="task-row__due">
                        {appt.time ? `🕒 ${appt.time}` : 'Saat belirtilmedi'} · {typeInfo?.label}
                      </div>
                    </div>
                    <button type="button" className="task-row__delete" onClick={() => handleDelete(appt.id)} title="Sil">
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
