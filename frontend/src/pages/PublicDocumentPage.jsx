import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Lock, RotateCcw, ChevronUp, ChevronDown } from 'lucide-react';
import { apiClient } from '../api/client.js';

const FULL_TEXT_BY_TYPE = {
  authorization_sale: `RE/MAX MLS-INTERNET SİSTEMİNE ALINMA
Taşınmazın Satılması Hakkında
GAYRİMENKUL DANIŞMANLIK YETKİLENDİRME SÖZLEŞMESİ

2. SÖZLEŞMENİN KONUSU
Bu sözleşmenin konusu RE/MAX PRIME'in, MÜŞTERİ'nin maliki olduğu ya da satmaya yetkili olduğu taşınmazın satışını gerçekleştirmek için vereceği tanıtım, pazarlama, aracılık hizmetleri ve bunlar karşılığında MÜŞTERİ tarafından ödenecek hizmet bedeli ile MÜŞTERİ'nin yükümlülüklerini düzenlemektir.

3. RE/MAX PRIME'İN, MÜŞTERİ'YE VERECEĞİ HİZMET
RE/MAX PRIME, taşınmazın bilgilerini RE/MAX ofisleri ağı internet sistemi içine alarak www.remax.com.tr adresinde yayınlamayı, masrafları kendisine ait olmak üzere taşınmazın her türlü aktif tanıtımını yaparak alıcı ile MÜŞTERİ arasında satış akdi ilişkisini kurmayı ve işi satış safhasına kadar getirmeyi kabul ve taahhüt eder.

4. MÜŞTERİ'NİN YÜKÜMLÜLÜKLERİ (özet)
MÜŞTERİ, taşınmaza serbestçe giriş imkanı sağlamayı, üçüncü kişilerden gelen başvuruları RE/MAX PRIME'e bildirmeyi, sözleşme süresi boyunca başka yollarla satış/kiralama işleminde bulunmamayı, ve RE/MAX PRIME'in bulduğu alıcı ile satışı gerçekleştirmeyi kabul ve taahhüt eder.

Hizmet bedeli: RE/MAX PRIME'in müşteriye vereceği hizmeti yerine getirmesi halinde, MÜŞTERİ taşınmazın satış bedelinin %2 + KDV'si tutarında hizmet bedeli ödemeyi kabul ve taahhüt eder.

MÜŞTERİ'nin yükümlülüklerini yerine getirmemesi halinde, RE/MAX PRIME'in satış bedelinin %4 + KDV'si tutarında cezai-şart hakkı doğar.

5. YETKİLENDİRME BELGESİ SÜRESİ
İşbu yetkilendirme belgesi süresi, taraflarca imzalandığı tarihten itibaren geçerlidir. MÜŞTERİ bu süre içinde yetkilendirme belgesini mücbir sebep olmaksızın tek taraflı feshedemez; haksız fesih halinde, satış bedelinin %4 + KDV'si tutarında bedeli cayma parası olarak öder.

6-7. TEBLİGAT ADRESLERİ VE YETKİLİ MAHKEMELER
Tarafların tebligat adresleri işbu belgenin 1. sayfasında belirtilen adresler olup, yetkilendirme belgesinden doğacak ihtilaflarda İstanbul (Anadolu) Mahkeme ve İcra Daireleri yetkilidir. Bu sözleşme içerisinde düzenlenmeyen hususlarda Taşınmaz Ticareti Hakkında Yönetmelik hükümleri geçerlidir.

Bu, sözleşmenin özet halidir. Sözleşmenin tam metnini ofisimizden talep edebilirsiniz.`,
};

const TITLE_BY_TYPE = {
  authorization_sale: 'Satılık portföy yetkilendirme sözleşmesi',
};

export default function PublicDocumentPage() {
  const { token } = useParams();
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showFullText, setShowFullText] = useState(false);
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
      .get(`/public/document/${token}`)
      .then((r) => setPayload(r.data))
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
      const body = { method };
      if (method === 'draw') {
        body.signatureImage = canvasRef.current.toDataURL('image/png');
      } else {
        body.signedName = typedName.trim();
      }
      await apiClient.post(`/public/document/${token}/sign`, body);
      setDone(true);
    } catch (err) {
      setSignError(err?.response?.data?.message || 'Onaylanamadı, tekrar deneyin.');
    } finally {
      setSigning(false);
    }
  }

  if (loading) {
    return <div style={{ maxWidth: 460, margin: '60px auto', textAlign: 'center', fontFamily: 'var(--font-body)', color: 'var(--cl-muted)' }}>Yükleniyor…</div>;
  }
  if (error) {
    return (
      <div style={{ maxWidth: 460, margin: '60px auto', padding: '0 20px', textAlign: 'center', fontFamily: 'var(--font-body)' }}>
        <AlertTriangle size={32} style={{ color: 'var(--cl-warning)', marginBottom: 12 }} />
        <p style={{ color: 'var(--cl-muted)' }}>{error}</p>
      </div>
    );
  }
  if (done) {
    return (
      <div style={{ maxWidth: 460, margin: '60px auto', padding: '0 20px', textAlign: 'center', fontFamily: 'var(--font-body)' }}>
        <CheckCircle2 size={40} style={{ color: 'var(--cl-success)', marginBottom: 12 }} />
        <p style={{ fontSize: 17, fontWeight: 600, margin: 0, color: 'var(--cl-text)' }}>Onaylandı</p>
        <p style={{ fontSize: 14, color: 'var(--cl-muted)', marginTop: 6 }}>Kaydınız alındı, danışmanınıza iletilecektir.</p>
      </div>
    );
  }

  const { type, data } = payload;
  const g = data.gayrimenkul || {};

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cl-bg)' }}>
      <div style={{ maxWidth: 460, margin: '0 auto', padding: '20px 16px 40px', fontFamily: 'var(--font-body)' }}>
        <div style={{ textAlign: 'center', marginBottom: 14, fontSize: 13, color: 'var(--cl-muted)', fontWeight: 600 }}>RE/MAX Prime · Bostancı</div>

        <div style={{ background: 'var(--cl-surface)', border: '1px solid var(--cl-border)', borderRadius: 14, padding: 16, marginBottom: 12 }}>
          <div style={{ fontFamily: 'var(--cl-font-heading)', fontSize: 16, fontWeight: 700, marginBottom: 4, color: 'var(--cl-text)' }}>{TITLE_BY_TYPE[type] || 'Sözleşme'}</div>
          <div style={{ fontSize: 13, color: 'var(--cl-muted)', marginBottom: 14 }}>
            Danışmanınız {data.danismanAdi || ''} tarafından hazırlandı
          </div>

          <div style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
            <Row label="Müşteri" value={data.musteriAdi} />
            <Row label="Gayrimenkul" value={g.baslik} />
            <Row label="Adres" value={[g.il, g.ilce, g.mahalle].filter(Boolean).join(' / ')} />
            {g.satisBedeli != null && <Row label="Satış bedeli" value={`${Number(g.satisBedeli).toLocaleString('tr-TR')} ₺`} />}
            {g.hizmetBedeliOrani && <Row label="Hizmet bedeli oranı" value={g.hizmetBedeliOrani} />}
          </div>

          <div style={{ fontSize: 12, color: 'var(--cl-muted)', lineHeight: 1.5, display: 'flex', alignItems: 'flex-start', gap: 5 }}>
            <Lock size={12} style={{ flexShrink: 0, marginTop: 2 }} /> Bu alanlar sistemden otomatik geldi, değiştirilemez.
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowFullText((v) => !v)}
          style={{ width: '100%', textAlign: 'left', fontSize: 13, color: 'var(--cl-primary-800)', background: 'var(--cl-surface)', border: '1px solid var(--cl-border)', borderRadius: 8, padding: '10px 12px', marginBottom: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
        >
          {showFullText ? <ChevronUp size={13} /> : <ChevronDown size={13} />} {showFullText ? 'Sözleşme özetini gizle' : 'Sözleşme metnini oku'}
        </button>

        {showFullText && (
          <div style={{ background: 'var(--cl-surface)', border: '1px solid var(--cl-border)', borderRadius: 8, padding: 14, marginBottom: 14, fontSize: 12.5, color: 'var(--cl-text)', lineHeight: 1.6, whiteSpace: 'pre-wrap', maxHeight: 260, overflowY: 'auto' }}>
            {FULL_TEXT_BY_TYPE[type] || 'Metin bulunamadı.'}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button type="button" onClick={() => setMethod('draw')} style={tabStyle(method === 'draw')}>Çizerek imzala</button>
          <button type="button" onClick={() => setMethod('type')} style={tabStyle(method === 'type')}>Yazarak imzala</button>
        </div>

        {method === 'draw' ? (
          <div style={{ marginBottom: 10 }}>
            <div style={{ position: 'relative', background: 'var(--cl-bg)', border: '1px solid var(--cl-border)', borderRadius: 12, height: 140, overflow: 'hidden' }}>
              <canvas ref={canvasRef} style={{ width: '100%', height: '100%', touchAction: 'none', cursor: 'crosshair' }} />
            </div>
            <button type="button" onClick={clearCanvas} style={{ marginTop: 6, fontSize: 12, padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: 4, background: 'none', border: '1px solid var(--cl-border)', borderRadius: 6, color: 'var(--cl-muted)', cursor: 'pointer' }}>
              <RotateCcw size={11} /> Temizle
            </button>
          </div>
        ) : (
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 13, color: 'var(--cl-muted)', display: 'block', marginBottom: 6 }}>Ad soyad</label>
            <input
              value={typedName}
              onChange={(e) => setTypedName(e.target.value)}
              placeholder="Adınızı ve soyadınızı yazın"
              style={{ width: '100%', height: 40, border: '1px solid var(--cl-border)', borderRadius: 8, padding: '0 12px', fontSize: 14, boxSizing: 'border-box' }}
            />
          </div>
        )}

        {signError && <div style={{ fontSize: 13, color: 'var(--cl-danger)', marginBottom: 8 }}>{signError}</div>}

        <button
          type="button"
          onClick={handleConfirm}
          disabled={signing}
          style={{ width: '100%', height: 44, background: 'var(--cl-primary-800)', color: '#fff', border: 'none', borderRadius: 9, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
        >
          {signing ? 'Kaydediliyor…' : 'Okudum, onaylıyorum'}
        </button>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  if (!value) return null;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '8px 10px', background: 'var(--cl-bg)', borderRadius: 8 }}>
      <span style={{ color: 'var(--cl-muted)' }}>{label}</span>
      <span style={{ fontWeight: 600, color: 'var(--cl-text)' }}>{value}</span>
    </div>
  );
}

function tabStyle(active) {
  return {
    flex: 1,
    height: 36,
    fontSize: 13,
    fontWeight: 600,
    border: active ? '1px solid var(--cl-primary-800)' : '1px solid var(--cl-border)',
    background: active ? 'var(--cl-primary-800)' : 'var(--cl-surface)',
    color: active ? '#fff' : 'var(--cl-muted)',
    borderRadius: 8,
    cursor: 'pointer',
  };
}
