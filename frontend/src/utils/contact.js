// Turkce telefon numaralarini (0555 123 45 67, 555 123 45 67, +90555... vb.)
// WhatsApp'in bekledigi formata (90XXXXXXXXXX, bosluk/artı isareti yok) cevirir.
export function toWhatsappNumber(phone) {
  let digits = (phone || '').replace(/\D/g, '');
  if (digits.startsWith('0')) digits = digits.slice(1);
  if (!digits.startsWith('90')) digits = '90' + digits;
  return digits;
}

export function buildWhatsappUrl(phone, message) {
  const number = toWhatsappNumber(phone);
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

export function buildMailtoUrl(email, subject, body) {
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
