import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { customersApi } from '../api/customers';
import { buildWhatsappUrl, buildMailtoUrl } from '../utils/contact.js';

export default function PropertyShareModal({ propertyId, propertyTitle, onClose }) {
  const [copied, setCopied] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const shareUrl = `${window.location.origin}/ilan/${propertyId}`;

  useEffect(() => {
    customersApi.list().then(setCustomers).catch(() => setCustomers([]));
  }, []);

  function handleCopy() {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const filteredCustomers = search
    ? customers.filter((c) =>
        `${c.firstName} ${c.lastName}`.toLowerCase().includes(search.toLowerCase()),
      )
    : customers;

  const messageText = selectedCustomer
    ? `Merhaba ${selectedCustomer.firstName}, "${propertyTitle}" ilanına göz atmanızı isterim: ${shareUrl}`
    : '';

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 380, textAlign: 'center', padding: 24, maxHeight: '85vh', overflowY: 'auto' }}>
        <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: 16 }}>İlanı Paylaş</h3>

        <div style={{ background: 'white', display: 'inline-block', padding: 12, borderRadius: 8 }}>
          <QRCodeSVG value={shareUrl} size={180} />
        </div>

        <div style={{ marginTop: 16, fontFamily: 'var(--font-mono)', fontSize: 12, wordBreak: 'break-all', color: 'var(--muted)' }}>
          {shareUrl}
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'center' }}>
          <button className="btn btn-secondary" onClick={handleCopy}>
            {copied ? 'Kopyalandı ✓' : 'Linki Kopyala'}
          </button>
        </div>

        <div style={{ borderTop: '1px solid var(--paper-line)', marginTop: 20, paddingTop: 16, textAlign: 'left' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, marginBottom: 10 }}>
            Bu İlanı Müşteriye Gönder
          </div>

          <input type="text" placeholder="Müşteri ara…" value={search} onChange={(e) => { setSearch(e.target.value); setSelectedCustomer(null); }} style={{ width: '100%', boxSizing: 'border-box', marginBottom: 8 }} />

          {!selectedCustomer && search && (
            <div style={{ maxHeight: 140, overflowY: 'auto', border: '1px solid var(--paper-line)', borderRadius: 6, marginBottom: 10 }}>
              {filteredCustomers.length === 0 ? (
                <div style={{ padding: 10, fontSize: 13, color: 'var(--muted)' }}>Müşteri bulunamadı.</div>
              ) : (
                filteredCustomers.map((c) => (
                  <div key={c.id} onClick={() => { setSelectedCustomer(c); setSearch(`${c.firstName} ${c.lastName}`); }} style={{ padding: '8px 10px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid var(--paper-line)' }}>
                    {c.firstName} {c.lastName}
                  </div>
                ))
              )}
            </div>
          )}

          {selectedCustomer && (
            <div style={{ display: 'flex', gap: 8 }}>
              <a href={buildWhatsappUrl(selectedCustomer.phone, messageText)} target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ textDecoration: 'none', background: '#25D366', color: 'white', borderColor: '#25D366', flex: 1, textAlign: 'center' }}>
                WhatsApp
              </a>
              {selectedCustomer.email && (
                <a href={buildMailtoUrl(selectedCustomer.email, propertyTitle, messageText)} className="btn btn-secondary" style={{ textDecoration: 'none', flex: 1, textAlign: 'center' }}>
                  E-posta
                </a>
              )}
            </div>
          )}
        </div>

        <button className="btn btn-secondary" onClick={onClose} style={{ marginTop: 16 }}>
          Kapat
        </button>
      </div>
    </div>
  );
}
