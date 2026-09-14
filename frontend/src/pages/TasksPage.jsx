import { useEffect, useState, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AlertTriangle, Calendar, Pencil, X, ChevronRight, ClipboardList, FilePlus2, CheckCircle2 } from 'lucide-react';
import { EmptyState, TableSkeleton } from '../components/Feedback';
import { PanelHead } from '../components/PanelHead';
import { tasksApi } from '../api/tasks';

function isOverdue(task) {
  if (!task.dueDate || task.completed) return false;
  const today = new Date().toISOString().slice(0, 10);
  return task.dueDate < today;
}

function isToday(task) {
  if (!task.dueDate) return false;
  const today = new Date().toISOString().slice(0, 10);
  return task.dueDate === today;
}

function formatDueDate(dueDate) {
  if (!dueDate) return null;
  return new Date(dueDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
}

export default function TasksPage() {
  const location = useLocation();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Takvim'deki "Yeni kayit ekle" menusunden "Gorev" secildiginde bu
  // sayfaya yonlendiriliyoruz -- kullanici tekrar "Yeni Gorev" alanini
  // aramasin diye otomatik odaklaniyoruz.
  useEffect(() => {
    if (location.state?.openQuickAdd) {
      document.getElementById('task-quick-add-title')?.focus();
    }
  }, [location.state]);
  const [editForm, setEditForm] = useState({ title: '', dueDate: '', notes: '' });
  const [editSaving, setEditSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await tasksApi.list().catch(() => []);
    setTasks(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAdd(e) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      await tasksApi.create({ title: title.trim(), dueDate: dueDate || undefined });
      setTitle('');
      setDueDate('');
      load();
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleComplete(task) {
    // Iyimser guncelleme -- hemen ekranda degistir, arka planda kaydet
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, completed: !t.completed } : t)));
    try {
      await tasksApi.update(task.id, { completed: !task.completed });
    } catch {
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, completed: task.completed } : t)));
      alert('Görev güncellenemedi, tekrar deneyin.');
    }
  }

  async function handleDelete(taskId) {
    if (!confirm('Bu görev silinsin mi?')) return;
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    try {
      await tasksApi.remove(taskId);
    } catch {
      alert('Görev silinemedi, sayfa yenileniyor.');
      load();
    }
  }

  function startEdit(task) {
    setEditingId(task.id);
    setEditForm({ title: task.title, dueDate: task.dueDate || '', notes: task.notes || '' });
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function saveEdit(taskId) {
    if (!editForm.title.trim()) return;
    setEditSaving(true);
    try {
      await tasksApi.update(taskId, {
        title: editForm.title.trim(),
        dueDate: editForm.dueDate || undefined,
        notes: editForm.notes || undefined,
      });
      setEditingId(null);
      load();
    } catch {
      alert('Görev güncellenemedi, tekrar deneyin.');
    } finally {
      setEditSaving(false);
    }
  }

  const visibleTasks = tasks.filter((t) => showCompleted || !t.completed);

  return (
    <div>
      <div className="cl-page-header">
        <div className="cl-page-header__text">
          <nav className="cl-breadcrumb" aria-label="Sayfa yolu">
            <Link to="/">Ana Sayfa</Link>
            <ChevronRight size={14} strokeWidth={2} aria-hidden="true" />
            <span aria-current="page">Görevler</span>
          </nav>
          <h2 className="cl-page-title">Görevler</h2>
          <p className="cl-page-subtitle">
            Kendi görevlerinizi ekleyin, son tarihleri takip edin ve tamamlandıkça işaretleyin.
          </p>
        </div>
      </div>
      <div className="folder-panel" style={{ marginBottom: 20 }}>
        <PanelHead
          Icon={FilePlus2}
          title="Yeni görev"
          note="Kısa bir başlık yazın; isterseniz son tarih de belirleyin."
        />
        <form onSubmit={handleAdd} className="form-row">
          <div className="form-field form-field--grow">
            <label>Yeni Görev</label>
            <input
              id="task-quick-add-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Örn: Ahmet Bey'i ara"
            />
          </div>
          <div className="form-field">
            <label>Son Tarih (opsiyonel)</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <button type="submit" className="btn btn-primary" disabled={saving || !title.trim()}>
            {saving ? 'Ekleniyor…' : (<><FilePlus2 size={16} strokeWidth={2} /> Ekle</>)}
          </button>
        </form>
      </div>

      <div className="folder-panel">
        <PanelHead
          Icon={ClipboardList}
          title={showCompleted ? 'Tüm görevler' : 'Bekleyen görevler'}
          note={showCompleted ? 'Tamamlananlar dahil' : 'Tamamlananlar gizli'}
          meta={loading ? undefined : `${visibleTasks.length} görev`}
        >
          <button type="button" className="btn btn-secondary btn--sm" onClick={() => setShowCompleted((v) => !v)}>
            {showCompleted ? 'Sadece bekleyenleri göster' : 'Tamamlananları da göster'}
          </button>
        </PanelHead>

        {loading ? (
          <TableSkeleton rows={5} columns={3} label="Görevler yükleniyor…" />
        ) : visibleTasks.length === 0 ? (
          showCompleted ? (
            <EmptyState
              Icon={ClipboardList}
              title="Henüz görev eklenmemiş"
              note="Yukarıdaki formdan ilk görevinizi ekleyebilirsiniz."
            />
          ) : (
            <EmptyState
              Icon={CheckCircle2}
              title="Bekleyen görev yok"
              note="Tamamlanmış görevleri de görmek isterseniz listeyi genişletebilirsiniz."
              actionLabel="Tamamlananları da göster"
              onAction={() => setShowCompleted(true)}
            />
          )
        ) : (
          visibleTasks.map((task) => (
            <div key={task.id} className="task-row">
              {editingId === task.id ? (
                <div className="task-row__edit-form">
                  <div className="form-field" style={{ margin: 0 }}>
                    <label>Başlık</label>
                    <input value={editForm.title} onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))} />
                  </div>
                  <div className="form-field" style={{ margin: 0 }}>
                    <label>Son Tarih</label>
                    <input type="date" value={editForm.dueDate} onChange={(e) => setEditForm((f) => ({ ...f, dueDate: e.target.value }))} />
                  </div>
                  <div className="form-field full" style={{ margin: 0 }}>
                    <label>Not</label>
                    <textarea rows={2} value={editForm.notes} onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))} />
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" className="btn btn-primary" disabled={editSaving || !editForm.title.trim()} onClick={() => saveEdit(task.id)}>
                      {editSaving ? 'Kaydediliyor…' : 'Kaydet'}
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={cancelEdit}>Vazgeç</button>
                  </div>
                </div>
              ) : (
                <>
                  <label className="task-row__checkbox">
                    <input type="checkbox" checked={task.completed} onChange={() => handleToggleComplete(task)} />
                  </label>
                  <div className="task-row__body">
                    <div className={`task-row__title${task.completed ? ' is-completed' : ''}`}>{task.title}</div>
                    {task.dueDate && (
                      <div className={`task-row__due${isOverdue(task) ? ' is-overdue' : ''}${isToday(task) ? ' is-today' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        {isOverdue(task) ? (<><AlertTriangle size={11} /> Gecikti</>) : isToday(task) ? (<><Calendar size={11} /> Bugün</>) : (<><Calendar size={11} /> {formatDueDate(task.dueDate)}</>)}
                      </div>
                    )}
                    {task.notes && <div className="task-row__notes">{task.notes}</div>}
                    {task.customerId && (
                      <Link to={`/musteriler/${task.customerId}`} className="task-row__link">Müşteriye git →</Link>
                    )}
                  </div>
                  <button type="button" className="task-row__edit" onClick={() => startEdit(task)} title="Düzenle">
                    <Pencil size={13} />
                  </button>
                  <button type="button" className="task-row__delete" onClick={() => handleDelete(task.id)} title="Sil">
                    <X size={13} />
                  </button>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
