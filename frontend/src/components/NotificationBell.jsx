import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationsApi } from '../api/notifications';
import { announcementsApi } from '../api/announcements';
import { useAuth } from '../context/AuthContext.jsx';

const TYPE_ICONS = {
  new_property: '🏠',
  property_status_changed: '🔄',
  new_customer: '👤',
  interaction: '📞',
  commission_added: '💰',
  commission_approved: '✅',
  property_pending_approval: '⏳',
  broker_message: '💬',
  showing_disclosure: '📝',
  announcement: '📢',
  deal_pending_approval: '🏆',
  collaborative_split_pending: '🤝',
};

function timeAgo(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'az önce';
  if (minutes < 60) return `${minutes} dk önce`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} sa önce`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} gün önce`;
  return new Date(dateStr).toLocaleDateString('tr-TR');
}

export default function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [detailItem, setDetailItem] = useState(null); // popup'ta acik olan bildirim
  const [dismissing, setDismissing] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiveItems, setArchiveItems] = useState([]);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const wrapperRef = useRef(null);
  const prevUnreadCountRef = useRef(null); // ilk yuklemede ses calmamak icin null ile basliyor
  const hasInteractedRef = useRef(false); // tarayicilarin otomatik ses engeline karsi

  // Tarayicilar, kullanici sayfa ile hic etkilesime girmeden otomatik ses
  // calinmasini engeller -- sayfadaki ilk tiklama/tus basisiyla "izin"
  // kazanilmis olur, sonraki bildirim sesleri sorunsuz calar.
  useEffect(() => {
    function markInteracted() {
      hasInteractedRef.current = true;
    }
    document.addEventListener('click', markInteracted, { once: true });
    document.addEventListener('keydown', markInteracted, { once: true });
    return () => {
      document.removeEventListener('click', markInteracted);
      document.removeEventListener('keydown', markInteracted);
    };
  }, []);

  function playNotificationSound() {
    if (!hasInteractedRef.current) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, ctx.currentTime);
      gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.35);
    } catch {
      // Web Audio API desteklenmiyor ya da tarayici engelledi -- sessizce gec
    }
  }

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const data = await notificationsApi.list();
      setItems(data.items);
      setUnreadCount(data.unreadCount);
      // Sadece SAYI ARTTIYSA (yeni bir sey geldiyse) ses cal -- ilk
      // yuklemede (prevUnreadCountRef.current === null) VEYA azalma/ayni
      // kalma durumunda calmiyoruz.
      if (prevUnreadCountRef.current !== null && data.unreadCount > prevUnreadCountRef.current) {
        playNotificationSound();
      }
      prevUnreadCountRef.current = data.unreadCount;
    } catch (e) {
      // Bildirim zili kritik bir ozellik degil; sessizce yut, sayfayi bozma
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, [user, load]);

  // Panel disina tiklaninca kapat
  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  async function handleToggle() {
    const next = !open;
    setOpen(next);
    if (next && unreadCount > 0) {
      try {
        await notificationsApi.markSeen();
        setUnreadCount(0);
        setItems((prev) => prev.map((i) => ({ ...i, read: true })));
      } catch (e) {
        // yoksay
      }
    }
  }

  function handleItemClick(item) {
    // 'broker_message' turu dogrudan ilgili portfoye goturur (icerigi zaten
    // orada gorunur) -- diger turler (orn. 'announcement') icin bir detay
    // popup'i acilir, cunku gidilecek ayri bir sayfalari yok.
    if (item.type === 'broker_message' && item.propertyId) {
      setOpen(false);
      navigate(`/portfoyler/${item.propertyId}`);
      return;
    }
    setDetailItem(item);
    setOpen(false);
    if (item.type === 'announcement' && item.announcementId && !item.read) {
      announcementsApi.markRead(item.announcementId).catch(() => {});
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, read: true } : i)));
    }
  }

  async function handleDismissAnnouncement() {
    if (!detailItem?.announcementId) return;
    setDismissing(true);
    try {
      await announcementsApi.dismiss(detailItem.announcementId);
      setItems((prev) => prev.filter((i) => i.id !== detailItem.id));
      setDetailItem(null);
    } catch {
      alert('Duyuru kaldırılamadı, tekrar deneyin.');
    } finally {
      setDismissing(false);
    }
  }

  // Gecmis Duyurular / Arsiv: daha once okunmus/kapatilmis duyurulari
  // gosterir -- backend'de zaten destekleniyordu (includeDismissed=true),
  // burada ilk kez gercek bir arayuz kazaniyor.
  async function handleOpenArchive() {
    setOpen(false);
    setArchiveOpen(true);
    setArchiveLoading(true);
    try {
      const all = await announcementsApi.list(true);
      setArchiveItems(all.filter((a) => a.isDismissed));
    } catch {
      setArchiveItems([]);
    } finally {
      setArchiveLoading(false);
    }
  }

  function handleArchiveItemClick(a) {
    setArchiveOpen(false);
    setDetailItem({
      id: `archive-${a.id}`,
      type: 'announcement',
      title: `Duyuru: ${a.title}`,
      message: a.message,
      agentName: 'Broker',
      occurredAt: a.createdAt,
      announcementId: a.id,
      read: true,
      fromArchive: true, // Sil butonunu gizlemek icin -- zaten arsivde/kapatilmis
    });
  }

  if (!user) return null;

  return (
    <div className="notif-bell" ref={wrapperRef}>
      <button
        type="button"
        className="notif-bell__button"
        onClick={handleToggle}
        aria-label="Bildirimler"
      >
        <span aria-hidden="true">🔔</span>
        {unreadCount > 0 && (
          <span className="notif-bell__badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>
      {open && (
        <div className="notif-bell__panel">
          <div className="notif-bell__header">İşlemler</div>
          {items.length === 0 ? (
            <div className="notif-bell__empty">Henüz işlem yok.</div>
          ) : (
            <div className="notif-bell__list">
              {items.map((item) => (
                <div
                  key={item.id}
                  className={`notif-bell__item${item.read ? '' : ' notif-bell__item--unread'} notif-bell__item--clickable`}
                  onClick={() => handleItemClick(item)}
                >
                  <span className="notif-bell__icon" aria-hidden="true">{TYPE_ICONS[item.type] || '•'}</span>
                  <div className="notif-bell__content">
                    <div className="notif-bell__title">{item.title}</div>
                    <div className="notif-bell__meta">{item.agentName} · {timeAgo(item.occurredAt)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <button type="button" className="notif-bell__archive-link" onClick={handleOpenArchive}>
            📜 Geçmiş Duyurular / Arşiv
          </button>
        </div>
      )}

      {detailItem && (
        <div className="modal-backdrop" onClick={() => setDetailItem(null)}>
          <div className="modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h2 style={{ margin: 0, fontSize: 18 }}>{TYPE_ICONS[detailItem.type] || '•'} {detailItem.title.replace(/^Duyuru: /, '')}</h2>
              <button type="button" className="office-modal__close" onClick={() => setDetailItem(null)}>✕</button>
            </div>
            <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 0 }}>
              {detailItem.agentName} · {new Date(detailItem.occurredAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
            </p>
            {detailItem.message ? (
              <p style={{ fontSize: 14, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{detailItem.message}</p>
            ) : (
              <p style={{ fontSize: 13, color: 'var(--muted)', fontStyle: 'italic' }}>Bu bildirim için ek içerik yok.</p>
            )}
            <div className="modal-actions" style={{ marginTop: 16, justifyContent: detailItem.type === 'announcement' && !detailItem.fromArchive ? 'space-between' : 'flex-end' }}>
              {detailItem.type === 'announcement' && !detailItem.fromArchive && (
                <button type="button" className="btn btn-secondary" style={{ color: 'var(--danger)' }} disabled={dismissing} onClick={handleDismissAnnouncement}>
                  {dismissing ? 'Kaldırılıyor…' : '🗑 Sil'}
                </button>
              )}
              <button type="button" className="btn btn-primary" onClick={() => setDetailItem(null)}>
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {archiveOpen && (
        <div className="modal-backdrop" onClick={() => setArchiveOpen(false)}>
          <div className="modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h2 style={{ margin: 0, fontSize: 18 }}>📜 Geçmiş Duyurular</h2>
              <button type="button" className="office-modal__close" onClick={() => setArchiveOpen(false)}>✕</button>
            </div>
            <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 0 }}>
              Daha önce okuyup kapattığın duyurular — üzerine tıklayınca tekrar tam içeriğini görebilirsin.
            </p>
            {archiveLoading ? (
              <div className="empty-state">Yükleniyor…</div>
            ) : archiveItems.length === 0 ? (
              <div className="empty-state">Henüz kapattığın bir duyuru yok.</div>
            ) : (
              <div style={{ maxHeight: '50vh', overflowY: 'auto' }}>
                {archiveItems.map((a) => (
                  <div
                    key={a.id}
                    className="notif-bell__item notif-bell__item--clickable"
                    onClick={() => handleArchiveItemClick(a)}
                    style={{ borderRadius: 6 }}
                  >
                    <span className="notif-bell__icon" aria-hidden="true">{a.type === 'celebration' ? '🎉' : '📢'}</span>
                    <div className="notif-bell__content">
                      <div className="notif-bell__title">{a.title}</div>
                      <div className="notif-bell__meta">{new Date(a.createdAt).toLocaleDateString('tr-TR')}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
