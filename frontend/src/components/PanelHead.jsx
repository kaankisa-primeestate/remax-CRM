// Panel basligi: ikon rozeti + baslik + tek satir aciklama, sagda istege
// bagli sayac/eylem. Butun sekmeler ve sayfalar ayni anatomiyi kullansin
// diye tek yerde tanimli.
export function PanelHead({ Icon, title, note, meta, children }) {
  return (
    <div className="panel-head">
      <div className="section-head">
        {Icon && (
          <span className="section-head__ico" aria-hidden="true">
            <Icon size={20} strokeWidth={2} />
          </span>
        )}
        <div className="section-head__text">
          <h3>{title}</h3>
          {note && <p>{note}</p>}
        </div>
      </div>
      {(meta || children) && (
        <div className="panel-head__actions">
          {meta && <span className="muted muted--sm">{meta}</span>}
          {children}
        </div>
      )}
    </div>
  );
}
