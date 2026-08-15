import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { appointmentsApi, APPOINTMENT_TYPES } from '../api/appointments';
import { customersApi } from '../api/customers';
import { propertiesApi } from '../api/properties';
import { buildWhatsappUrl } from '../utils/contact.js';

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

// Yer Gosterme beyan metni -- WhatsApp uzerinden musteriye gonderilir,
// e-imza yerine gecen pratik bir kanit/kayit olusturur.
function buildDisclosureMessage({ agentName, customerName, propertyTitle, date, time }) {
  const dateLabel = new Date(date).toLocaleDateString('tr-TR');
  return (
    `Sayın ${customerName},\n\n` +
    `${dateLabel}${time ? ` saat ${time}` : ''} tarihinde "${propertyTitle}" mülkünü ` +
    `tarafınıza gösterdiğimi/tanıttığımı beyan ederim. Bu mesaj, PrimeCRM üzerinden ` +
    `kaydedilen yer gösterme kaydının onayı niteliğindedir.\n\n` +
    `${agentName}`
  );
}

export default function CalendarPage() {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
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

  const load = useCallback(async () => {
    setLoading(true);
    const [appts, custs, props] = await Promise.all([
      appointmentsApi.list(),
      customersApi.list({}),
      propertiesApi.list({}),
    ]);
    setAppointments(appts);
    setCustomers(custs);
    setProperties(props);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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

  function handleShareDisclosure(appt) {
    const customer = customers.find((c) => c.id === appt.customerId);
    const property = properties.find((p) => p.id === appt.propertyId);
    if (!customer || !customer.phone) {
      alert('Bu randevuya bağlı bir müşteri veya telefon numarası bulunamadı.');
      return;
    }
    const message = buildDisclosureMessage({
      agentName: 'Danışmanınız',
      customerName: `${customer.firstName} ${customer.lastName}`,
      propertyTitle: property?.title || appt.title,
      date: appt.date,
      time: appt.time,
    });
    window.open(buildWhatsappUrl(customer.phone, message), '_blank');
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
