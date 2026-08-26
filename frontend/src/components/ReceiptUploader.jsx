import { useState } from 'react';
import { uploadFile } from '../api/client';

// Fis/Fatura/Dekont yukleme icin ORTAK, kucuk bir bilesen -- Gider,
// Ortak Sermaye, Banka Hareketi, ve Cek/Senet formlarinin HEPSI ayni
// bicimde kullaniyor. Merkezi yukleme servisini (POST /upload) kullanir,
// yeni bir altyapi kurmaz.
export default function ReceiptUploader({ value, onChange, label = 'Fiş / Dekont Ekle' }) {
  const [uploading, setUploading] = useState(false);

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadFile(file);
      onChange(url);
    } catch {
      alert('Dosya yüklenemedi, tekrar deneyin.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  return (
    <div className="form-field" style={{ margin: 0 }}>
      <label>{label}</label>
      {value ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <a href={value} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12 }}>
            📎 Görüntüle
          </a>
          <button type="button" onClick={() => onChange(null)} style={{ fontSize: 11, color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            Kaldır
          </button>
        </div>
      ) : (
        <input type="file" accept="image/*,application/pdf" onChange={handleFileChange} disabled={uploading} style={{ fontSize: 12, width: 150 }} />
      )}
      {uploading && <span style={{ fontSize: 11, color: 'var(--muted)' }}>Yükleniyor…</span>}
    </div>
  );
}
