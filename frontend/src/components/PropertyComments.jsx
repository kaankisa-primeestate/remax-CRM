import { useEffect, useState, useCallback } from 'react';
import { propertyCommentsApi } from '../api/propertyComments';

function formatDateTime(d) {
  return new Date(d).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

// Broker <-> Danisman yazismalari (ozellikle "Revize Iste" surecinde
// kullanilir, ama herhangi bir portfoy hakkinda genel iletisim icin de
// kullanilabilir). Her portfoy detay sayfasinda gorunur.
export default function PropertyComments({ propertyId }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await propertyCommentsApi.list(propertyId);
    setComments(data);
    setLoading(false);
  }, [propertyId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSend(e) {
    e.preventDefault();
    if (!message.trim()) return;
    setSending(true);
    try {
      await propertyCommentsApi.create(propertyId, message.trim());
      setMessage('');
      load();
    } catch (err) {
      alert('Mesaj gönderilemedi, tekrar deneyin.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="panel" style={{ marginTop: 20 }}>
      <h3 className="panel__title">Broker / Danışman Yazışması</h3>

      {loading ? (
        <div className="panel__empty">Yükleniyor…</div>
      ) : comments.length === 0 ? (
        <div className="panel__empty">Henüz bir yazışma yok.</div>
      ) : (
        <div className="comment-thread">
          {comments.map((c) => (
            <div key={c.id} className={`comment-bubble comment-bubble--${c.authorRole}`}>
              <div className="comment-bubble__header">
                <span className="comment-bubble__author">
                  {c.authorName} <span className="comment-bubble__role">({c.authorRole === 'broker' ? 'Broker' : 'Danışman'})</span>
                </span>
                <span className="comment-bubble__time">{formatDateTime(c.createdAt)}</span>
              </div>
              <div className="comment-bubble__text">{c.message}</div>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSend} style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Mesajınızı yazın…"
          rows={2}
          style={{ flex: 1, resize: 'vertical' }}
        />
        <button type="submit" className="btn btn-primary" disabled={sending || !message.trim()}>
          {sending ? '…' : 'Gönder'}
        </button>
      </form>
    </div>
  );
}
