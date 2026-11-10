export function whatsappNumber(value: string) {
  const digits = value.replace(/\D/g, "");
  const international = digits.startsWith("00") ? digits.slice(2) : digits;
  // La boutique est française : un numéro mobile local saisi en 06/07 reste
  // utilisable dans WhatsApp et dans l’API Cloud.
  return /^0[67]\d{8}$/.test(international)
    ? `33${international.slice(1)}`
    : international;
}

export function whatsappLink(number: string, message: string) {
  const recipient = whatsappNumber(number);
  return recipient.length >= 8 && recipient.length <= 15
    ? `https://wa.me/${recipient}?text=${encodeURIComponent(message)}`
    : null;
}

export function orderWhatsAppMessage({
  id,
  name,
  date,
  total,
  items,
  trackingUrl,
}: {
  id: string;
  name: string;
  date: string;
  total: string;
  items: string[];
  trackingUrl?: string;
}) {
  return [
    "Bonjour, je souhaite confirmer ma demande de retrait.",
    "",
    `Référence : ${id}`,
    `Client : ${name}`,
    `Retrait souhaité : ${date}`,
    "",
    "Ma sélection :",
    ...items.map((item) => `• ${item}`),
    "",
    `Total estimé : ${total}`,
    trackingUrl ? `Suivi : ${trackingUrl}` : "",
    "",
    "Merci de me confirmer la disponibilité.",
  ]
    .filter(Boolean)
    .join("\n");
}
