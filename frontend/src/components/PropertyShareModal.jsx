import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

export default function PropertyShareModal({ propertyId, onClose }) {
  const [copied, setCopied] = useState(false);
  const shareUrl = `${window.location.origin}/ilan/${propertyId}`;

  function handleCopy() {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 360, textAlign: 'center', padding: 24 }}
      >
        <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: 16 }}>İlanı Paylaş</h3>

        <div style={{ background: 'white', display: 'inline-block', padding: 12, borderRadius: 8 }}>
          <QRCodeSVG value={shareUrl} size={200} />
        </div>

        <div
          style={{
            marginTop: 16,
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            wordBreak: 'break-all',
            color: 'var(--muted)',
          }}
        >
          {shareUrl}
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'center' }}>
          <button className="btn btn-secondary" onClick={handleCopy}>
            {copied ? 'Kopyalandı ✓' : 'Linki Kopyala'}
          </button>
          <button className="btn btn-secondary" onClick={onClose}>
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}
