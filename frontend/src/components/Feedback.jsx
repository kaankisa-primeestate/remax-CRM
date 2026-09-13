// Bos durum ve yukleniyor gostergeleri. Tum sayfalarda ayni dili
// konussun diye burada tek yerde tanimli; sayfaya ozel surum yazilmamali.

/**
 * Bos liste / sonuc bulunamadi durumu.
 * Eylem butonu yalnizca gercekten calisan bir islev varsa verilir;
 * suslemek icin buton konmaz.
 */
export function EmptyState({ Icon, title, note, actionLabel, onAction }) {
  return (
    <div className="empty-state">
      {Icon && (
        <span className="empty-state__ico" aria-hidden="true">
          <Icon size={24} strokeWidth={1.75} />
        </span>
      )}
      <p className="empty-state__title">{title}</p>
      {note && <p className="empty-state__note">{note}</p>}
      {actionLabel && onAction && (
        <button type="button" className="btn btn-secondary empty-state__action" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}

/**
 * Tablo yuklenirken gosterilen iskelet. Satir sayisi gelecek kaydin
 * yerini tutar; icerik gelince sayfa zipladmadan yerine oturur.
 * Ekran okuyucuya iskelet degil "yukleniyor" bilgisi gider.
 */
export function TableSkeleton({ rows = 5, columns = 5, label = 'Yükleniyor…' }) {
  return (
    <div
      className="skeleton-table"
      role="status"
      aria-live="polite"
      aria-busy="true"
      /* Sutun sayisi degisken oldugu icin CSS'e degisken olarak geciyor. */
      style={{ '--iskelet-sutun': columns }}
    >
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }).map((_, satir) => (
        <div className="skeleton-table__row" key={satir} aria-hidden="true">
          {Array.from({ length: columns }).map((_, sutun) => (
            <span className="skeleton" key={sutun} />
          ))}
        </div>
      ))}
    </div>
  );
}
