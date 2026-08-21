import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { appointmentsApi, APPOINTMENT_TYPES } from '../api/appointments';
import { customersApi } from '../api/customers';
import { propertiesApi } from '../api/properties';
import { tasksApi } from '../api/tasks';
import { calendarApi, CALENDAR_EVENT_COLORS, CALENDAR_EVENT_CATEGORIES } from '../api/calendar';
import { buildWhatsappUrl } from '../utils/contact.js';

function pad(n) {
  return String(n).padStart(2, '0');
}
function toDateStr(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function todayStr() {
  return toDateStr(new Date());
}
function startOfWeek(d) {
  // Pazartesi baslangicli hafta
  const day = d.getDay(); // 0=Pazar
  const diff = (day === 0 ? -6 : 1) - day;
  const res = new Date(d);
  res.setDate(d.getDate() + diff);
  return res;
}
function addDays(d, n) {
  const res = new Date(d);
  res.setDate(res.getDate() + n);
  return res;
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

// Yer Gosterme beyan metni -- WhatsApp uzerinden musteriye gonderilir,
// e-imza yerine gecen pratik bir kanit/kayit olusturur.
function buildDisclosureMessage({ customerName, propertyTitle, date, time }) {
  const dateLabel = new Date(date).toLocaleDateString('tr-TR');
  return (
    `Sayın ${customerName},\n\n` +
    `${dateLabel}${time ? ` saat ${time}` : ''} tarihinde "${propertyTitle}" mülkünü ` +
    `tarafınıza gösterdiğimi/tanıttığımı beyan ederim. Bu mesaj, PrimeCRM üzerinden ` +
    `kaydedilen yer gösterme kaydının onayı niteliğindedir.\n\n` +
    `Danışmanınız`
  );
}

const VIEW_TABS = [
  { key: 'month', label: '📅 Aylık' },
  { key: 'week', label: '🗓️ Haftalık' },
  { key: 'agenda', label: '📋 Ajanda' },
];

export default function CalendarPage() {
  const navigate = useNavigate();
  const [view, setView] = useState(() => localStorage.getItem('crm-calendar-view') || 'week');
  const [anchorDate, setAnchorDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [activeCategories, setActiveCategories] = useState(() => CALENDAR_EVENT_CATEGORIES.map((c) => c.key));

  const [appointments, setAppointments] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPast, setShowPast] = useState(false);

  const [title, setTitle] = useState('');
  const [date, setDate] = useState(todayStr());
  const [time, setTime] = useState('');
  const [type, setType] = useState('meeting');
  const [customerId, setCustomerId] = useState('');
  const [propertyId, setPropertyId] = useState('');
  const [disclosureAccepted, setDisclosureAccepted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    title: '', date: '', time: '', type: 'meeting', customerId: '', propertyId: '', disclosureAccepted: false, notes: '',
  });
  const [editSaving, setEditSaving] = useState(false);

  const [quickTaskTitle, setQuickTaskTitle] = useState('');
  const [quickTaskSaving, setQuickTaskSaving] = useState(false);

  useEffect(() => {
    localStorage.setItem('crm-calendar-view', view);
  }, [view]);

  const load = useCallback(async () => {
    setLoading(true);
    const [appts, tsks, custs, props] = await Promise.all([
      appointmentsApi.list(),
      tasksApi.list().catch(() => []),
      customersApi.list({}),
      propertiesApi.list({}),
    ]);
    setAppointments(appts);
    setTasks(tsks);
    setCustomers(custs);
    setProperties(props);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Aylik/haftalik goruntulenen tarih araligi -- gorunume gore degisir.
  // Aylik: ekrandaki tam ay ızgarasi (onceki/sonraki aydan tasan gunler dahil)
  // Haftalik: Pazartesi-Pazar
  const range = useMemo(() => {
    if (view === 'month') {
      const first = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1);
      const last = new Date(anchorDate.getFullYear(), anchorDate.getMonth() + 1, 0);
      const gridStart = startOfWeek(first);
      const gridEnd = addDays(startOfWeek(last), 6);
      return { from: toDateStr(gridStart), to: toDateStr(gridEnd) };
    }
    if (view === 'week') {
      const s = startOfWeek(anchorDate);
      return { from: toDateStr(s), to: toDateStr(addDays(s, 6)) };
    }
    // agenda: genis bir aralik (gecmis + 90 gun ileri), zaten kendi
    // appointments/tasks state'ini kullaniyor, calendarApi'ye ihtiyaci yok
    return { from: '2020-01-01', to: '2035-12-31' };
  }, [view, anchorDate]);

  const loadEvents = useCallback(async () => {
    if (view === 'agenda') return;
    setEventsLoading(true);
    try {
      const data = await calendarApi.getEvents(range.from, range.to);
      setEvents(data);
    } catch {
      setEvents([]);
    } finally {
      setEventsLoading(false);
    }
  }, [view, range.from, range.to]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  function toggleCategory(key) {
    setActiveCategories((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }

  function categoryOf(eventType) {
    const cat = CALENDAR_EVENT_CATEGORIES.find((c) => c.includes ? c.includes.includes(eventType) : c.key === eventType);
    return cat?.key || eventType;
  }

  const visibleEvents = events.filter((e) => activeCategories.includes(categoryOf(e.type)));
  const eventsByDate = useMemo(() => {
    const map = {};
    for (const e of visibleEvents) {
      if (!map[e.date]) map[e.date] = [];
      map[e.date].push(e);
    }
    return map;
  }, [visibleEvents]);

  function resetForm() {
    setTitle('');
    setTime('');
    setCustomerId('');
    setPropertyId('');
    setDisclosureAccepted(false);
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (!title.trim() || !date) return;
    setSaving(true);
    try {
      await appointmentsApi.create({
        title: title.trim(),
        date,
        time: time || undefined,
        type,
        customerId: customerId || undefined,
        propertyId: propertyId || undefined,
        disclosureAccepted: type === 'showing' ? disclosureAccepted : undefined,
      });
      resetForm();
      load();
      loadEvents();
    } finally {
      setSaving(false);
    }
  }

  async function handleQuickAddAppointment(dateStr) {
    const t = prompt('Randevu başlığı:');
    if (!t || !t.trim()) return;
    try {
      await appointmentsApi.create({ title: t.trim(), date: dateStr, type: 'meeting' });
      load();
      loadEvents();
    } catch {
      alert('Randevu eklenemedi.');
    }
  }

  async function handleQuickAddTask(dateStr) {
    if (!quickTaskTitle.trim()) return;
    setQuickTaskSaving(true);
    try {
      await tasksApi.create({ title: quickTaskTitle.trim(), dueDate: dateStr });
      setQuickTaskTitle('');
      load();
      loadEvents();
    } catch {
      alert('Görev eklenemedi.');
    } finally {
      setQuickTaskSaving(false);
    }
  }

  async function handleToggleComplete(appt) {
    setAppointments((prev) => prev.map((a) => (a.id === appt.id ? { ...a, completed: !a.completed } : a)));
    try {
      await appointmentsApi.update(appt.id, { completed: !appt.completed });
      loadEvents();
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
      loadEvents();
    } catch {
      alert('Randevu silinemedi, sayfa yenileniyor.');
      load();
    }
  }

  function startEdit(appt) {
    setEditingId(appt.id);
    setEditForm({
      title: appt.title,
      date: appt.date,
      time: appt.time || '',
      type: appt.type,
      customerId: appt.customerId || '',
      propertyId: appt.propertyId || '',
      disclosureAccepted: !!appt.disclosureAccepted,
      notes: appt.notes || '',
    });
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function saveEdit(apptId) {
    if (!editForm.title.trim() || !editForm.date) return;
    setEditSaving(true);
    try {
      await appointmentsApi.update(apptId, {
        title: editForm.title.trim(),
        date: editForm.date,
        time: editForm.time || undefined,
        type: editForm.type,
        customerId: editForm.customerId || undefined,
        propertyId: editForm.propertyId || undefined,
        disclosureAccepted: editForm.type === 'showing' ? editForm.disclosureAccepted : undefined,
        notes: editForm.notes || undefined,
      });
      setEditingId(null);
      load();
      loadEvents();
    } catch {
      alert('Randevu güncellenemedi, tekrar deneyin.');
    } finally {
      setEditSaving(false);
    }
  }

  function handleShareDisclosure(appt) {
    const customer = customers.find((c) => c.id === appt.customerId);
    const property = properties.find((p) => p.id === appt.propertyId);
    if (!customer || !customer.phone) {
      alert('Bu randevuya bağlı bir müşteri veya telefon numarası bulunamadı.');
      return;
    }
    const message = buildDisclosureMessage({
      customerName: `${customer.firstName} ${customer.lastName}`,
      propertyTitle: property?.title || appt.title,
      date: appt.date,
      time: appt.time,
    });
    window.open(buildWhatsappUrl(customer.phone, message), '_blank');
  }

  function handleEventClick(e) {
    if (e.linkPath) navigate(e.linkPath);
  }

  const today = todayStr();
  const visible = appointments.filter((a) => showPast || a.date >= today);
  const grouped = [];
  for (const appt of visible) {
    let group = grouped.find((g) => g.date === appt.date);
    if (!group) {
      group = { date: appt.date, items: [] };
      grouped.push(group);
    }
    group.items.push(appt);
  }

  // Aylik izgara hesaplamasi -- goruntulenen izgara ile calendarApi'den
  // CEKILEN tarih araligi (range useMemo) AYNI gridStart/gridEnd'i
  // kullanmali, aksi halde bazi aylarda (5 haftaya sigan) ekranda gorunen
  // son satirin verisi hic cekilmemis olurdu.
  const monthGridDays = useMemo(() => {
    if (view !== 'month') return [];
    const first = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1);
    const last = new Date(anchorDate.getFullYear(), anchorDate.getMonth() + 1, 0);
    const gridStart = startOfWeek(first);
    const gridEnd = addDays(startOfWeek(last), 6);
    const days = [];
    let cursor = gridStart;
    while (cursor <= gridEnd) {
      days.push(cursor);
      cursor = addDays(cursor, 1);
    }
    return days;
  }, [view, anchorDate]);

  const weekDays = useMemo(() => {
    if (view !== 'week') return [];
    const s = startOfWeek(anchorDate);
    return Array.from({ length: 7 }, (_, i) => addDays(s, i));
  }, [view, anchorDate]);

  function navigatePeriod(delta) {
    if (view === 'month') {
      setAnchorDate((d) => new Date(d.getFullYear(), d.getMonth() + delta, 1));
    } else {
      setAnchorDate((d) => addDays(d, delta * 7));
    }
  }

  const selectedDayEvents = (eventsByDate[selectedDate] || []).sort((a, b) => (a.time || '00:00').localeCompare(b.time || '00:00'));

  return (
    <div>
      <button
        type="button"
        onClick={() => navigate(-1)}
        style={{
          fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--muted)', background: 'transparent',
          border: 'none', padding: 0, marginBottom: 12, cursor: 'pointer', display: 'block',
        }}
      >
        ← Geri Dön
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
        <h2 className="dossier__name" style={{ margin: 0 }}>Takvim</h2>
        <div className="folder-tabs">
          {VIEW_TABS.map((t) => (
            <button key={t.key} className={`folder-tab ${view === t.key ? 'active' : ''}`} onClick={() => setView(t.key)}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {(view === 'month' || view === 'week') && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button type="button" className="btn btn-secondary" style={{ padding: '4px 12px' }} onClick={() => navigatePeriod(-1)}>←</button>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, minWidth: 160, textAlign: 'center' }}>
                {view === 'month'
                  ? anchorDate.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })
                  : `${toDateStr(startOfWeek(anchorDate))} — ${toDateStr(addDays(startOfWeek(anchorDate), 6))}`}
              </span>
              <button type="button" className="btn btn-secondary" style={{ padding: '4px 12px' }} onClick={() => navigatePeriod(1)}>→</button>
              <button type="button" className="btn btn-secondary" style={{ fontSize: 12 }} onClick={() => { setAnchorDate(new Date()); setSelectedDate(todayStr()); }}>
                Bugün
              </button>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {CALENDAR_EVENT_CATEGORIES.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => toggleCategory(c.key)}
                  style={{
                    fontSize: 11, fontFamily: 'var(--font-mono)', padding: '3px 9px', borderRadius: 999,
                    border: '1px solid var(--paper-line)', cursor: 'pointer',
                    background: activeCategories.includes(c.key) ? 'var(--ink-navy)' : 'transparent',
                    color: activeCategories.includes(c.key) ? 'white' : 'var(--muted)',
                  }}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {/* TAKVIM IZGARASI */}
            <div style={{ flex: '1 1 560px', minWidth: 320 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, marginBottom: 6 }}>
                {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map((d) => (
                  <div key={d} style={{ textAlign: 'center', fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--muted)' }}>{d}</div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
                {(view === 'month' ? monthGridDays : weekDays).map((d) => {
                  const dStr = toDateStr(d);
                  const isCurrentMonth = view === 'week' || d.getMonth() === anchorDate.getMonth();
                  const isToday = dStr === today;
                  const isSelected = dStr === selectedDate;
                  const dayEvents = eventsByDate[dStr] || [];
                  const hasOverdue = dayEvents.some((e) => e.overdue);
                  return (
                    <button
                      key={dStr}
                      type="button"
                      onClick={() => setSelectedDate(dStr)}
                      style={{
                        minHeight: view === 'month' ? 66 : 90,
                        padding: 6,
                        textAlign: 'left',
                        borderRadius: 8,
                        cursor: 'pointer',
                        border: isSelected ? '2px solid var(--ink-navy)' : '1px solid var(--paper-line)',
                        background: dayEvents.length > 0 ? '#fbfaf5' : 'white',
                        opacity: isCurrentMonth ? 1 : 0.4,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 3,
                      }}
                    >
                      <span style={{ fontSize: 12, fontWeight: isToday ? 700 : 400, color: isToday ? 'var(--ink-navy)' : 'inherit' }}>
                        {isToday && '● '}{d.getDate()}
                      </span>
                      {dayEvents.slice(0, view === 'month' ? 2 : 4).map((e) => {
                        const colors = CALENDAR_EVENT_COLORS[e.type] || { bg: '#eee', fg: '#333' };
                        return (
                          <span
                            key={e.id}
                            style={{
                              fontSize: 9.5, background: colors.bg, color: colors.fg, borderRadius: 3, padding: '1px 4px',
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: e.completed ? 'line-through' : 'none',
                            }}
                          >
                            {e.time ? `${e.time} ` : ''}{e.title}
                          </span>
                        );
                      })}
                      {dayEvents.length > (view === 'month' ? 2 : 4) && (
                        <span style={{ fontSize: 9, color: 'var(--muted)' }}>+{dayEvents.length - (view === 'month' ? 2 : 4)} tane daha</span>
                      )}
                      {hasOverdue && <span style={{ fontSize: 9, color: 'var(--danger)' }}>⏱ gecikmiş</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* GUN DETAY PANELI */}
            <div style={{ flex: '1 1 280px', minWidth: 260 }}>
              <div className="folder-panel">
                <h3 style={{ fontFamily: 'var(--font-display)', margin: '0 0 10px', fontSize: 15 }}>
                  {formatDateLabel(selectedDate)}
                </h3>
                {eventsLoading ? (
                  <div className="empty-state">Yükleniyor…</div>
                ) : selectedDayEvents.length === 0 ? (
                  <div className="empty-state">Bu gün için planlanmış bir şey yok.</div>
                ) : (
                  selectedDayEvents.map((e) => {
                    const colors = CALENDAR_EVENT_COLORS[e.type] || { bg: '#eee', fg: '#333' };
                    return (
                      <div
                        key={e.id}
                        onClick={() => handleEventClick(e)}
                        style={{
                          padding: '8px 10px', borderRadius: 6, marginBottom: 6, cursor: e.linkPath ? 'pointer' : 'default',
                          background: colors.bg, borderLeft: `3px solid ${colors.fg}`,
                        }}
                      >
                        <div style={{ fontSize: 12.5, fontWeight: 600, color: colors.fg, textDecoration: e.completed ? 'line-through' : 'none' }}>
                          {e.time && <span style={{ fontFamily: 'var(--font-mono)' }}>{e.time} · </span>}
                          {e.title}
                        </div>
                        {e.subtitle && <div style={{ fontSize: 11, color: 'var(--muted)' }}>{e.subtitle}</div>}
                        {e.overdue && <div style={{ fontSize: 10, color: 'var(--danger)' }}>⏱ Süresi geçti</div>}
                      </div>
                    );
                  })
                )}
                <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
                  <button type="button" className="btn btn-secondary" style={{ fontSize: 11, flex: 1 }} onClick={() => handleQuickAddAppointment(selectedDate)}>
                    + Randevu
                  </button>
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                  <input
                    value={quickTaskTitle}
                    onChange={(e) => setQuickTaskTitle(e.target.value)}
                    placeholder="Hızlı görev ekle…"
                    style={{ flex: 1, fontSize: 12 }}
                    onKeyDown={(e) => e.key === 'Enter' && handleQuickAddTask(selectedDate)}
                  />
                  <button type="button" className="btn btn-primary" style={{ fontSize: 11 }} disabled={quickTaskSaving || !quickTaskTitle.trim()} onClick={() => handleQuickAddTask(selectedDate)}>
                    Ekle
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {view === 'agenda' && (
        <>
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

              {type === 'showing' && (
                <>
                  <div className="form-field" style={{ margin: 0, minWidth: 160 }}>
                    <label>Müşteri</label>
                    <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                      <option value="">Seçiniz</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-field" style={{ margin: 0, minWidth: 160 }}>
                    <label>Portföy</label>
                    <select value={propertyId} onChange={(e) => setPropertyId(e.target.value)}>
                      <option value="">Seçiniz</option>
                      {properties.map((p) => (
                        <option key={p.id} value={p.id}>{p.title}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <button type="submit" className="btn btn-primary" disabled={saving || !title.trim()}>
                {saving ? 'Ekleniyor…' : '+ Ekle'}
              </button>

              {type === 'showing' && (
                <div className="form-field full" style={{ flexDirection: 'row', alignItems: 'center', gap: 8, margin: 0 }}>
                  <input
                    type="checkbox"
                    checked={disclosureAccepted}
                    onChange={(e) => setDisclosureAccepted(e.target.checked)}
                    style={{ width: 'auto' }}
                  />
                  <label style={{ textTransform: 'none', fontFamily: 'var(--font-body)', fontSize: 13 }}>
                    Yer gösterme beyanı müşteriye iletildi / onaylandı
                  </label>
                </div>
              )}
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
                    const isShowing = appt.type === 'showing';
                    const customer = customers.find((c) => c.id === appt.customerId);
                    const property = properties.find((p) => p.id === appt.propertyId);
                    return (
                      <div key={appt.id} className="task-row">
                        {editingId === appt.id ? (
                          <div className="task-row__edit-form">
                            <div className="form-field" style={{ margin: 0 }}>
                              <label>Başlık</label>
                              <input value={editForm.title} onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))} />
                            </div>
                            <div className="form-field" style={{ margin: 0 }}>
                              <label>Tarih</label>
                              <input type="date" value={editForm.date} onChange={(e) => setEditForm((f) => ({ ...f, date: e.target.value }))} />
                            </div>
                            <div className="form-field" style={{ margin: 0 }}>
                              <label>Saat</label>
                              <input type="time" value={editForm.time} onChange={(e) => setEditForm((f) => ({ ...f, time: e.target.value }))} />
                            </div>
                            <div className="form-field" style={{ margin: 0 }}>
                              <label>Tür</label>
                              <select value={editForm.type} onChange={(e) => setEditForm((f) => ({ ...f, type: e.target.value }))}>
                                {APPOINTMENT_TYPES.map((t) => (
                                  <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
                                ))}
                              </select>
                            </div>
                            {editForm.type === 'showing' && (
                              <>
                                <div className="form-field" style={{ margin: 0, minWidth: 160 }}>
                                  <label>Müşteri</label>
                                  <select value={editForm.customerId} onChange={(e) => setEditForm((f) => ({ ...f, customerId: e.target.value }))}>
                                    <option value="">Seçiniz</option>
                                    {customers.map((c) => (
                                      <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
                                    ))}
                                  </select>
                                </div>
                                <div className="form-field" style={{ margin: 0, minWidth: 160 }}>
                                  <label>Portföy</label>
                                  <select value={editForm.propertyId} onChange={(e) => setEditForm((f) => ({ ...f, propertyId: e.target.value }))}>
                                    <option value="">Seçiniz</option>
                                    {properties.map((p) => (
                                      <option key={p.id} value={p.id}>{p.title}</option>
                                    ))}
                                  </select>
                                </div>
                                <div className="form-field full" style={{ flexDirection: 'row', alignItems: 'center', gap: 8, margin: 0 }}>
                                  <input
                                    type="checkbox"
                                    checked={editForm.disclosureAccepted}
                                    onChange={(e) => setEditForm((f) => ({ ...f, disclosureAccepted: e.target.checked }))}
                                    style={{ width: 'auto' }}
                                  />
                                  <label style={{ textTransform: 'none', fontFamily: 'var(--font-body)', fontSize: 13 }}>
                                    Yer gösterme beyanı alındı
                                  </label>
                                </div>
                              </>
                            )}
                            <div className="form-field full" style={{ margin: 0 }}>
                              <label>Not</label>
                              <textarea rows={2} value={editForm.notes} onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))} />
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button type="button" className="btn btn-primary" disabled={editSaving || !editForm.title.trim() || !editForm.date} onClick={() => saveEdit(appt.id)}>
                                {editSaving ? 'Kaydediliyor…' : 'Kaydet'}
                              </button>
                              <button type="button" className="btn btn-secondary" onClick={cancelEdit}>Vazgeç</button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <label className="task-row__checkbox">
                              <input type="checkbox" checked={appt.completed} onChange={() => handleToggleComplete(appt)} />
                            </label>
                            <div className="task-row__body">
                              <div className={`task-row__title${appt.completed ? ' is-completed' : ''}`}>
                                {typeInfo?.icon} {appt.title}
                              </div>
                              <div className="task-row__due">
                                {appt.time ? `🕒 ${appt.time}` : 'Saat belirtilmedi'} · {typeInfo?.label}
                                {isShowing && customer && ` · ${customer.firstName} ${customer.lastName}`}
                                {isShowing && property && ` · ${property.title}`}
                                {isShowing && (
                                  <span className={appt.disclosureAccepted ? 'disclosure-badge disclosure-badge--ok' : 'disclosure-badge'}>
                                    {appt.disclosureAccepted ? '✓ Beyan alındı' : '⚠️ Beyan bekleniyor'}
                                  </span>
                                )}
                              </div>
                              {appt.notes && <div className="task-row__notes">{appt.notes}</div>}
                              {isShowing && customer && (
                                <button
                                  type="button"
                                  className="task-row__link"
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                                  onClick={() => handleShareDisclosure(appt)}
                                >
                                  📲 WhatsApp ile Yer Gösterme Kaydını Gönder
                                </button>
                              )}
                            </div>
                            <button type="button" className="task-row__edit" onClick={() => startEdit(appt)} title="Düzenle">
                              ✎
                            </button>
                            <button type="button" className="task-row__delete" onClick={() => handleDelete(appt.id)} title="Sil">
                              ✕
                            </button>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
