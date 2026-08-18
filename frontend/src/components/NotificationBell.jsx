import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationsApi } from '../api/notifications';
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
  const wrapperRef = useRef(null);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const data = await notificationsApi.list();
      setItems(data.items);
      setUnreadCount(data.unreadCount);
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
    if (item.propertyId) {
      setOpen(false);
      navigate(`/portfoyler/${item.propertyId}`);
    }
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
                  className={`notif-bell__item${item.read ? '' : ' notif-bell__item--unread'}${item.propertyId ? ' notif-bell__item--clickable' : ''}`}
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
        </div>
      )}
    </div>
  );
}
