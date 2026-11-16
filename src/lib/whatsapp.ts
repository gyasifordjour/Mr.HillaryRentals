export function getGhanaWhatsAppNumber(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10 && digits.startsWith("0")) return `233${digits.slice(1)}`;
  if (digits.length === 12 && digits.startsWith("233")) return digits;
  return null;
}

export function buildWhatsAppChatUrl(phone: string, message: string) {
  const number = getGhanaWhatsAppNumber(phone);
  if (!number) return null;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
