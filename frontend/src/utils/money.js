// Sadece rakamlari birakir (nokta/virgul/harf temizlenir)
export function digitsOnly(str) {
  return (str || '').toString().replace(/[^\d]/g, '');
}

// Rakam dizisini Turkce binlik ayraciyla (nokta) gosterir: '2800000' -> '2.800.000'
export function formatThousands(digits) {
  if (!digits) return '';
  return Number(digits).toLocaleString('tr-TR');
}
