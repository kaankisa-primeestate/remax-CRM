import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationsApi } from '../api/notifications';
import { announcementsApi } from '../api/announcements';
import { usersApi } from '../api/auth';
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
  const { user, isBroker } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [detailItem, setDetailItem] = useState(null); // popup'ta acik olan bildirim
  const [dismissing, setDismissing] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiveItems, setArchiveItems] = useState([]);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [soundPermission, setSoundPermission] = useState(() =>
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported',
  );
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeAgents, setComposeAgents] = useState([]);
  const [composeTitle, setComposeTitle] = useState('');
  const [composeMessage, setComposeMessage] = useState('');
  const [composeType, setComposeType] = useState('general');
  const [composeSendToAll, setComposeSendToAll] = useState(true);
  const [composeSelectedAgentIds, setComposeSelectedAgentIds] = useState([]);
  const [composeSaving, setComposeSaving] = useState(false);
  const wrapperRef = useRef(null);
  const prevUnreadCountRef = useRef(null); // ilk yuklemede ses calmamak icin null ile basliyor
  const audioCtxRef = useRef(null); // tek, yeniden kullanilan ses baglami

  function getAudioContext() {
    if (!audioCtxRef.current) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      audioCtxRef.current = new Ctx();
    }
    return audioCtxRef.current;
  }

  // Tarayicinin GERCEK bildirim izni istemini kullaniyoruz (Notification
  // API) -- bu, kullanicinin acikca "Izin Ver / Engelle" secebilecegi
  // resmi bir tarayici diyalogu acar. Ayni tiklama icinde ses baglamini
  // da "kilidini ac"iyoruz (kullanici jesti sayesinde), boylece sonraki
  // otomatik bildirim sesleri tarayici tarafindan engellenmez.
  async function handleRequestSoundPermission() {
    if (typeof Notification === 'undefined') {
      alert('Tarayıcınız bildirim izni özelliğini desteklemiyor.');
      return;
    }
    try {
      const result = await Notification.requestPermission();
      setSoundPermission(result);
      const ctx = getAudioContext();
      if (ctx && ctx.state === 'suspended') await ctx.resume();
    } catch {
      // yoksay
    }
  }

  function playNotificationSound() {
    if (soundPermission !== 'granted') return; // izin verilmediyse HIC calma
    const ctx = getAudioContext();
    if (!ctx) return;
    try {
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
      // Web Audio API desteklenmiyor -- sessizce gec
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
    // orada, kalici olarak duruyor) -- bu yuzden ayri bir popup/Sil
    // adimina gerek yok, tiklaninca otomatik olarak zil listesinden
    // kaldirilir (kapatilir). Diger turler (orn. 'announcement') icin
    // bir detay popup'i acilir, cunku gidilecek ayri bir sayfalari yok.
    if (item.type === 'broker_message' && item.propertyId) {
      setOpen(false);
      navigate(`/portfoyler/${item.propertyId}`);
      notificationsApi.dismiss(item.id).catch(() => {});
      setItems((prev) => prev.filter((i) => i.id !== item.id));
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

  // Hizli Duyuru: Broker'in Danisman Yonetimi -> Duyurular sekmesine
  // gitmeden, herhangi bir sayfadan (zil paneli uzerinden) hizlica
  // duyuru gonderebilmesi icin. Ayni backend endpoint'ini kullanir.
  async function handleOpenCompose() {
    setOpen(false);
    setComposeOpen(true);
    if (composeAgents.length === 0) {
      try {
        const data = await usersApi.listAgents();
        setComposeAgents(data);
      } catch {
        setComposeAgents([]);
      }
    }
  }

  async function handleSubmitCompose(e) {
    e.preventDefault();
    if (!composeTitle.trim() || !composeMessage.trim()) return;
    setComposeSaving(true);
    try {
      await announcementsApi.create({
        title: composeTitle.trim(),
        message: composeMessage.trim(),
        type: composeType,
        targetAgentIds: composeSendToAll ? undefined : composeSelectedAgentIds,
      });
      setComposeOpen(false);
      setComposeTitle('');
      setComposeMessage('');
      setComposeType('general');
      setComposeSendToAll(true);
      setComposeSelectedAgentIds([]);
    } catch {
      alert('Duyuru gönderilemedi, tekrar deneyin.');
    } finally {
      setComposeSaving(false);
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
          <div className="notif-bell__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>İşlemler</span>
            {isBroker && (
              <button
                type="button"
                onClick={handleOpenCompose}
                style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-navy)', background: 'transparent', border: '1px solid var(--paper-line)', borderRadius: 4, padding: '2px 8px', cursor: 'pointer', textTransform: 'none', letterSpacing: 0 }}
              >
                + Duyuru
              </button>
            )}
          </div>
          {soundPermission === 'default' && (
            <div style={{ padding: '8px 14px', background: '#eef3f9', borderBottom: '1px solid var(--paper-line)', fontSize: 11, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <span>🔔 Yeni bildirim geldiğinde ses çalsın mı?</span>
              <button
                type="button"
                onClick={handleRequestSoundPermission}
                style={{ fontFamily: 'var(--font-mono)', fontSize: 10, background: 'var(--ink-navy)', color: 'white', border: 'none', borderRadius: 4, padding: '3px 8px', cursor: 'pointer', flexShrink: 0 }}
              >
                İzin Ver
              </button>
            </div>
          )}
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
            {(detailItem.type === 'commission_added' || detailItem.type === 'deal_pending_approval') && detailItem.transactionId && (
              <button
                type="button"
                className="btn btn-primary"
                style={{ width: '100%', marginTop: 4 }}
                onClick={() => {
                  navigate(`/islemler/${detailItem.transactionId}?tab=financial`);
                  setDetailItem(null);
                }}
              >
                📂 İşlem Dosyasını Aç ve Onayla
              </button>
            )}
            {detailItem.type === 'showing_disclosure' && (
              <button
                type="button"
                className="btn btn-primary"
                style={{ width: '100%', marginTop: 4 }}
                onClick={() => {
                  navigate('/sozlesmeler');
                  setDetailItem(null);
                }}
              >
                📄 Sözleşmeler & Tapu'yu Aç
              </button>
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

      {composeOpen && (
        <div className="modal-backdrop" onClick={() => setComposeOpen(false)}>
          <div className="modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h2 style={{ margin: 0, fontSize: 18 }}>📢 Hızlı Duyuru Gönder</h2>
              <button type="button" className="office-modal__close" onClick={() => setComposeOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmitCompose}>
              <div className="form-field" style={{ marginBottom: 10 }}>
                <label>Başlık</label>
                <input value={composeTitle} onChange={(e) => setComposeTitle(e.target.value)} required />
              </div>
              <div className="form-field" style={{ marginBottom: 10 }}>
                <label>Mesaj</label>
                <textarea rows={3} value={composeMessage} onChange={(e) => setComposeMessage(e.target.value)} required style={{ width: '100%' }} />
              </div>
              <div className="form-field" style={{ marginBottom: 10 }}>
                <label>Tür</label>
                <select value={composeType} onChange={(e) => setComposeType(e.target.value)}>
                  <option value="general">📢 Genel Duyuru</option>
                  <option value="celebration">🎉 Kutlama</option>
                  <option value="meeting">📅 Toplantı / Anket (katılım onayı istenir)</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: 14, marginBottom: 10 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, fontWeight: 400 }}>
                  <input type="radio" checked={composeSendToAll} onChange={() => setComposeSendToAll(true)} />
                  Tüm danışmanlara
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, fontWeight: 400 }}>
                  <input type="radio" checked={!composeSendToAll} onChange={() => setComposeSendToAll(false)} />
                  Seçili danışmanlara
                </label>
              </div>
              {!composeSendToAll && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14, maxHeight: 120, overflowY: 'auto' }}>
                  {composeAgents.map((a) => (
                    <label key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 400, background: 'var(--paper)', padding: '3px 8px', borderRadius: 4 }}>
                      <input
                        type="checkbox"
                        checked={composeSelectedAgentIds.includes(a.id)}
                        onChange={(e) =>
                          setComposeSelectedAgentIds((prev) =>
                            e.target.checked ? [...prev, a.id] : prev.filter((id) => id !== a.id),
                          )
                        }
                      />
                      {a.name}
                    </label>
                  ))}
                </div>
              )}
              <div className="modal-actions">
                <button type="submit" className="btn btn-primary" disabled={composeSaving}>
                  {composeSaving ? 'Gönderiliyor…' : 'Duyuruyu Gönder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
