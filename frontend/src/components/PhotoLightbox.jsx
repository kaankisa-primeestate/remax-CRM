import { useEffect } from 'react';

export default function PhotoLightbox({ photos, index, onClose, onNavigate }) {
  useEffect(() => {
    function handleKey(e) {
      if (index == null) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') onNavigate((index + 1) % photos.length);
      if (e.key === 'ArrowLeft') onNavigate((index - 1 + photos.length) % photos.length);
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [index, photos, onClose, onNavigate]);

  if (index == null) return null;

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <button onClick={(e) => { e.stopPropagation(); onClose(); }} style={{ position: 'absolute', top: 20, right: 20, background: 'transparent', border: 'none', color: 'white', fontSize: 32, cursor: 'pointer', lineHeight: 1 }}>
        ×
      </button>

      {photos.length > 1 && (
        <button onClick={(e) => { e.stopPropagation(); onNavigate((index - 1 + photos.length) % photos.length); }} style={{ position: 'absolute', left: 16, background: 'transparent', border: 'none', color: 'white', fontSize: 40, cursor: 'pointer', padding: 12 }}>
          ‹
        </button>
      )}

      <img src={photos[index]} onClick={(e) => e.stopPropagation()} alt="" style={{ maxWidth: '90vw', maxHeight: '85vh', objectFit: 'contain', borderRadius: 8 }} />

      {photos.length > 1 && (
        <button onClick={(e) => { e.stopPropagation(); onNavigate((index + 1) % photos.length); }} style={{ position: 'absolute', right: 16, background: 'transparent', border: 'none', color: 'white', fontSize: 40, cursor: 'pointer', padding: 12 }}>
          ›
        </button>
      )}

      {photos.length > 1 && (
        <div style={{ position: 'absolute', bottom: 24, color: 'white', fontFamily: 'var(--font-mono)', fontSize: 13 }}>
          {index + 1} / {photos.length}
        </div>
      )}
    </div>
  );
}
