// Sadece rakamlari birakir
export function digitsOnly(str) {
  return (str || '').toString().replace(/[^\d]/g, '');
}

// Rakam dizisini Turkce binlik ayraciyla (nokta) gosterir
export function formatThousands(digits) {
  if (!digits) return '';
  return Number(digits).toLocaleString('tr-TR');
}
