// Eslesme Guveni rozeti: anahtar kelime skoru tek basina yaniltici olabilir
// (bos bir profilde bile sans eseri 1 kelime tutarsa yuksek skor cikabilir).
// Bu rozet, musteri VE portfoy profilinin ne kadar dolu oldugunu da gosterip
// eslesmenin ne kadar "guvenilir" oldugu konusunda ek baglam saglar.
// Backend'den gelen alanlar: confidenceLevel ('high'|'medium'|'low'),
// confidenceScore, customerCompleteness, propertyCompleteness.

const LEVEL_META = {
  high: { label: 'Yüksek Güven', className: 'match-confidence--high' },
  medium: { label: 'Orta Güven', className: 'match-confidence--medium' },
  low: { label: 'Düşük Güven', className: 'match-confidence--low' },
};

export default function MatchConfidenceBadge({ match }) {
  const meta = LEVEL_META[match.confidenceLevel] || LEVEL_META.low;
  const title =
    `Güven skoru: %${match.confidenceScore}\n` +
    `Müşteri profili %${match.customerCompleteness} dolu\n` +
    `Portföy bilgisi %${match.propertyCompleteness} dolu\n` +
    `(Eksik bilgi, eşleşmenin güvenilirliğini düşürür.)`;
  return (
    <span className={`match-confidence ${meta.className}`} title={title}>
      {meta.label}
    </span>
  );
}
