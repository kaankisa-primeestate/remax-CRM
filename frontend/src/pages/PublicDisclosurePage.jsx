import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiClient } from '../api/client.js';

export default function PublicDisclosurePage() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [method, setMethod] = useState('draw');
  const [typedName, setTypedName] = useState('');
  const [signing, setSigning] = useState(false);
  const [done, setDone] = useState(false);
  const [signError, setSignError] = useState('');

  const canvasRef = useRef(null);
  const drawingRef = useRef(false);
  const hasDrawnRef = useRef(false);

  useEffect(() => {
    apiClient
      .get(`/public/disclosure/${token}`)
      .then((r) => setData(r.data))
      .catch((err) => {
        setError(err?.response?.status === 410 ? 'Bu belge zaten imzalanmış.' : 'Bu link geçersiz veya süresi dolmuş.');
      })
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (method !== 'draw' || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      ctx.strokeStyle = '#1a1a1a';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
    };
    resize();

    const pos = (e) => {
      const rect = canvas.getBoundingClientRect();
      const t = e.touches ? e.touches[0] : e;
      return { x: t.clientX - rect.left, y: t.clientY - rect.top };
    };
    const start = (e) => {
      drawingRef.current = true;
      hasDrawnRef.current = true;
      const p = pos(e);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      e.preventDefault();
    };
    const move = (e) => {
      if (!drawingRef.current) return;
      const p = pos(e);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      e.preventDefault();
    };
    const end = () => { drawingRef.current = false; };

    canvas.addEventListener('mousedown', start);
    canvas.addEventListener('mousemove', move);
    window.addEventListener('mouseup', end);
    canvas.addEventListener('touchstart', start);
    canvas.addEventListener('touchmove', move);
    canvas.addEventListener('touchend', end);
    return () => {
      canvas.removeEventListener('mousedown', start);
      canvas.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', end);
      canvas.removeEventListener('touchstart', start);
      canvas.removeEventListener('touchmove', move);
      canvas.removeEventListener('touchend', end);
    };
  }, [method]);

  function clearCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    hasDrawnRef.current = false;
  }

  async function handleConfirm() {
    setSignError('');
    if (method === 'draw' && !hasDrawnRef.current) {
      setSignError('Devam etmeden önce imzanızı çizin.');
      return;
    }
    if (method === 'type' && !typedName.trim()) {
      setSignError('Devam etmeden önce adınızı yazın.');
      return;
    }
    setSigning(true);
    try {
      const payload = { method };
      if (method === 'draw') {
        payload.signatureImage = canvasRef.current.toDataURL('image/png');
      } else {
        payload.signedName = typedName.trim();
      }
      await apiClient.post(`/public/disclosure/${token}/sign`, payload);
      setDone(true);
    } catch (err) {
      setSignError(err?.response?.data?.message || 'Onaylanamadı, tekrar deneyin.');
    } finally {
      setSigning(false);
    }
  }

  if (loading) {
    return <div style={{ maxWidth: 420, margin: '60px auto', textAlign: 'center', fontFamily: 'sans-serif', color: '#666' }}>Yükleniyor…</div>;
  }

  if (error) {
    return (
      <div style={{ maxWidth: 420, margin: '60px auto', padding: '0 20px', textAlign: 'center', fontFamily: 'sans-serif' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
        <p style={{ color: '#666' }}>{error}</p>
      </div>
    );
  }

  if (done) {
    return (
      <div style={{ maxWidth: 420, margin: '60px auto', padding: '0 20px', textAlign: 'center', fontFamily: 'sans-serif' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
        <p style={{ fontSize: 17, fontWeight: 600, margin: 0 }}>Onaylandı</p>
        <p style={{ fontSize: 14, color: '#666', marginTop: 6 }}>Kaydınız alındı, danışmanınıza iletilecektir.</p>
      </div>
    );
  }

  const dateLabel = data.date ? new Date(data.date).toLocaleDateString('tr-TR') : '';

  return (
    <div style={{ maxWidth: 420, margin: '20px auto', padding: '0 16px 40px', fontFamily: 'sans-serif' }}>
      <div style={{ textAlign: 'center', marginBottom: 14, fontSize: 13, color: '#888' }}>RE/MAX Prime · Bostancı</div>

      <div style={{ background: '#fafafa', border: '1px solid #e5e5e5', borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Taşınmaz gösterme beyanı</div>
        <div style={{ fontSize: 13, color: '#666', marginBottom: 14 }}>
          {dateLabel}{data.time ? ` saat ${data.time}` : ''} tarihinde tarafınıza yapılan gösterimin onayı
        </div>

        <div style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
          <Row label="Müşteri" value={data.customerName} />
          {data.propertyTitle && <Row label="Gayrimenkul" value={data.propertyTitle} />}
          {data.agentName && <Row label="Danışman" value={data.agentName} />}
        </div>

        <div style={{ fontSize: 12, color: '#999', lineHeight: 1.5 }}>🔒 Bu alanlar sistemden otomatik geldi, değiştirilemez.</div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button type="button" onClick={() => setMethod('draw')} style={tabStyle(method === 'draw')}>Çizerek imzala</button>
        <button type="button" onClick={() => setMethod('type')} style={tabStyle(method === 'type')}>Yazarak imzala</button>
      </div>

      {method === 'draw' ? (
        <div style={{ marginBottom: 10 }}>
          <div style={{ position: 'relative', background: '#fafafa', border: '1px solid #ccc', borderRadius: 12, height: 140, overflow: 'hidden' }}>
            <canvas ref={canvasRef} style={{ width: '100%', height: '100%', touchAction: 'none', cursor: 'crosshair' }} />
          </div>
          <button type="button" onClick={clearCanvas} style={{ marginTop: 6, fontSize: 12, padding: '4px 10px' }}>↺ Temizle</button>
        </div>
      ) : (
        <div style={{ marginBottom: 10 }}>
          <label style={{ fontSize: 13, color: '#666', display: 'block', marginBottom: 6 }}>Ad soyad</label>
          <input
            value={typedName}
            onChange={(e) => setTypedName(e.target.value)}
            placeholder="Adınızı ve soyadınızı yazın"
            style={{ width: '100%', height: 40, border: '1px solid #ccc', borderRadius: 8, padding: '0 12px', fontSize: 14, boxSizing: 'border-box' }}
          />
        </div>
      )}

      {signError && <div style={{ fontSize: 13, color: '#c0392b', marginBottom: 8 }}>{signError}</div>}

      <button
        type="button"
        onClick={handleConfirm}
        disabled={signing}
        style={{ width: '100%', height: 44, background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
      >
        {signing ? 'Kaydediliyor…' : 'Okudum, onaylıyorum'}
      </button>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '8px 10px', background: '#fff', borderRadius: 8 }}>
      <span style={{ color: '#888' }}>{label}</span>
      <span style={{ fontWeight: 600 }}>{value}</span>
    </div>
  );
}

function tabStyle(active) {
  return {
    flex: 1,
    height: 36,
    fontSize: 13,
    fontWeight: 600,
    border: active ? '1px solid #1a1a2e' : '1px solid #ddd',
    background: active ? '#1a1a2e' : '#fff',
    color: active ? '#fff' : '#666',
    borderRadius: 8,
    cursor: 'pointer',
  };
}
