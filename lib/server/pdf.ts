// Documents PDF (A4) : liste de courses, demandes professionnelles et devis.
// Polices standard du PDF (aucun fichier externe) : le texte est ramené au
// jeu de caractères WinAnsi (accents français, €, œ).
import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from "pdf-lib";
import type { Order, Quote, Settings } from "../types";
import { isFree, origins, recurrences } from "../types";
import {
  amountLabel,
  freeQuantity,
  indicativeWeight,
  itemLabel,
  lineHT,
  quoteTotals,
  rateLabel,
  weightLabel,
} from "../requests";
import { formatTime, longDate, money } from "../shop";

const A4 = { w: 595.28, h: 841.89 };
const M = 48;
const INK = rgb(0.12, 0.11, 0.1);
const MUTED = rgb(0.42, 0.4, 0.36);
const ACCENT = rgb(0.48, 0.12, 0.17);
const LINE = rgb(0.85, 0.82, 0.77);

/** Caractères hors WinAnsi remplacés (espaces fines, tirets, flèches…). */
function clean(text: string) {
  return text
    .replace(/[   ]/g, " ")
    .replace(/[−‐‑]/g, "-")
    .replace(/[→]/g, "->")
    .replace(/[^\x20-\x7e -ÿ€Œœ‘’“”…–—•]/g, "");
}

class Writer {
  doc!: PDFDocument;
  page!: PDFPage;
  regular!: PDFFont;
  bold!: PDFFont;
  y = 0;
  pages: PDFPage[] = [];

  static async create() {
    const w = new Writer();
    w.doc = await PDFDocument.create();
    w.regular = await w.doc.embedFont(StandardFonts.Helvetica);
    w.bold = await w.doc.embedFont(StandardFonts.HelveticaBold);
    w.addPage();
    return w;
  }
  addPage() {
    this.page = this.doc.addPage([A4.w, A4.h]);
    this.pages.push(this.page);
    this.y = A4.h - M;
  }
  ensure(height: number) {
    if (this.y - height < M + 24) this.addPage();
  }
  wrap(text: string, font: PDFFont, size: number, width: number) {
    const lines: string[] = [];
    for (const paragraph of clean(text).split("\n")) {
      let line = "";
      for (const word of paragraph.split(/\s+/)) {
        const next = line ? `${line} ${word}` : word;
        if (font.widthOfTextAtSize(next, size) <= width) line = next;
        else {
          if (line) lines.push(line);
          line = word;
          while (font.widthOfTextAtSize(line, size) > width && line.length > 1) {
            let cut = line.length - 1;
            while (cut > 1 && font.widthOfTextAtSize(line.slice(0, cut), size) > width) cut--;
            lines.push(line.slice(0, cut));
            line = line.slice(cut);
          }
        }
      }
      lines.push(line);
    }
    return lines;
  }
  text(
    text: string,
    opts: { x?: number; size?: number; bold?: boolean; color?: ReturnType<typeof rgb>; width?: number; gap?: number } = {},
  ) {
    const size = opts.size ?? 10;
    const font = opts.bold ? this.bold : this.regular;
    const x = opts.x ?? M;
    const width = opts.width ?? A4.w - M - x;
    for (const line of this.wrap(text, font, size, width)) {
      this.ensure(size * 1.4);
      this.page.drawText(line, { x, y: this.y - size, size, font, color: opts.color ?? INK });
      this.y -= size * 1.35;
    }
    this.y -= opts.gap ?? 0;
  }
  /** Texte sur une ligne, sans retour, à une position donnée. */
  at(text: string, x: number, y: number, size = 10, bold = false, color = INK, align: "left" | "right" = "left") {
    const font = bold ? this.bold : this.regular;
    const value = clean(text);
    const dx = align === "right" ? font.widthOfTextAtSize(value, size) : 0;
    this.page.drawText(value, { x: x - dx, y, size, font, color });
  }
  rule(gap = 10) {
    this.ensure(gap * 2);
    this.y -= gap;
    this.page.drawLine({ start: { x: M, y: this.y }, end: { x: A4.w - M, y: this.y }, thickness: 0.6, color: LINE });
    this.y -= gap;
  }
  heading(text: string) {
    this.ensure(40);
    this.y -= 6;
    this.text(text.toUpperCase(), { size: 8.5, bold: true, color: ACCENT, gap: 4 });
  }
  checkbox(x: number, y: number) {
    this.page.drawRectangle({ x, y, width: 10, height: 10, borderColor: INK, borderWidth: 0.8 });
  }
  footer(text: string) {
    this.pages.forEach((page, n) => {
      page.drawText(clean(`${text} — page ${n + 1}/${this.pages.length}`), {
        x: M,
        y: 26,
        size: 7.5,
        font: this.regular,
        color: MUTED,
      });
    });
  }
}

function shopHeader(w: Writer, settings: Settings, title: string, subtitle?: string) {
  w.at(settings.name, M, w.y - 14, 15, true);
  w.at(settings.address, M, w.y - 28, 8.5, false, MUTED);
  w.at([settings.phone, settings.email].filter(Boolean).join(" · "), M, w.y - 39, 8.5, false, MUTED);
  w.at(title, A4.w - M, w.y - 14, 13, true, ACCENT, "right");
  if (subtitle) w.at(subtitle, A4.w - M, w.y - 28, 9, false, MUTED, "right");
  w.y -= 52;
  w.rule(6);
}

const paris = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris",
  });

const slot = (date: string, time: string) =>
  date ? `${longDate(date)}${time ? ` à ${formatTime(time)}` : ""}` : "À convenir";

/**
 * Liste de courses ou demande de commande, imprimable. Contient le strict
 * nécessaire : référence, créneau, articles et cases à cocher.
 */
export async function orderDocument(order: Order, settings: Settings) {
  const w = await Writer.create();
  const pro = order.origin === "pro";
  const title =
    order.origin === "liste"
      ? "Ma liste de courses"
      : pro
        ? "Demande de commande"
        : "Récapitulatif de commande";
  shopHeader(w, settings, title, `Référence ${order.id}`);
  if (pro)
    w.text("Demande de commande — en attente de validation. Ce document n’est ni une facture ni un devis accepté.", {
      size: 9.5,
      bold: true,
      color: ACCENT,
      gap: 6,
    });
  w.text(`Retrait souhaité : ${slot(order.date, order.time)}`, { size: 11, bold: true });
  if (pro && order.pro?.slotMode === "flexible") w.text("Créneau flexible", { size: 9, color: MUTED });
  w.text(`Demande reçue le ${paris(order.createdAt)}`, { size: 9, color: MUTED, gap: 4 });
  if (pro && order.pro) {
    w.text(`${order.pro.company} — ${order.pro.contactName}`, { size: 10 });
    if (order.pro.poReference) w.text(`Votre référence : ${order.pro.poReference}`, { size: 9, color: MUTED });
  } else {
    w.text(`Au nom de : ${order.firstName || order.name}`, { size: 10 });
  }

  w.heading(`Articles (${order.items.length})`);
  for (const item of order.items) {
    const details: string[] = [];
    if (isFree(item)) {
      if (item.cut) details.push(`Découpe : ${item.cut}`);
      if (item.portionGrams) details.push(`Poids cible : ${item.portionGrams} g par pièce`);
      if (item.packaging) details.push(`Conditionnement : ${item.packaging}`);
      if (item.note) details.push(item.note);
      const weight = pro ? indicativeWeight(item) : null;
      if (weight && item.unit === "piece") details.push(`Poids total indicatif : ${weightLabel(weight)}`);
    } else if (item.options.length) details.push(item.options.join(", "));
    const label = isFree(item) ? item.name : itemLabel(item);
    const qty = isFree(item) ? freeQuantity(item.quantity, item.unit) : "";
    w.ensure(18 + details.length * 12);
    const top = w.y;
    w.checkbox(M, top - 11);
    w.at(label, M + 18, top - 10, 10.5, true);
    if (qty) w.at(qty, A4.w - M, top - 10, 10.5, true, INK, "right");
    w.y -= 16;
    for (const d of details) w.text(d, { x: M + 18, size: 9, color: MUTED, width: A4.w - 2 * M - 18 });
    w.y -= 4;
  }
  if (order.notes) {
    w.heading(pro ? "Consignes de préparation" : "Instructions");
    w.text(order.notes, { size: 9.5 });
  }
  if (pro && order.pro) {
    w.heading("Besoin");
    w.text(recurrences[order.pro.recurrence] + (order.pro.recurrenceDetail ? ` — ${order.pro.recurrenceDetail}` : ""), { size: 9.5 });
    if (order.pro.eventDate) w.text(`Événement : ${longDate(order.pro.eventDate)}`, { size: 9.5 });
    if (order.pro.covers) w.text(`Couverts : ${order.pro.covers}`, { size: 9.5 });
  }
  w.rule(8);
  w.text(
    order.origin === "catalogue"
      ? `Total estimé : ${amountLabel(order.total)}. Le montant définitif dépend des poids préparés. Paiement lors du retrait.`
      : "Les produits sont soumis à disponibilité. Les prix et le montant final seront confirmés par la boucherie selon les articles et les poids préparés. Paiement lors du retrait.",
    { size: 8.5, color: MUTED },
  );
  w.footer(`${settings.name} — ${order.id}`);
  return w.doc.save();
}

/** Demande de devis transmise par un professionnel (avant établissement). */
async function quoteRequestDocument(quote: Quote, settings: Settings) {
  const w = await Writer.create();
  shopHeader(w, settings, "Demande de devis", `Référence ${quote.id}`);
  w.text("Demande de devis — ce document n’est pas un devis : les prix et disponibilités seront confirmés par la boucherie.", {
    size: 9.5,
    bold: true,
    color: ACCENT,
    gap: 6,
  });
  w.text(`${quote.customer.company} — ${quote.customer.name}`, { size: 11, bold: true });
  w.text(`Demande reçue le ${paris(quote.createdAt)}`, { size: 9, color: MUTED, gap: 4 });
  const r = quote.request;
  if (r) {
    if (r.date) w.text(`Retrait souhaité : ${slot(r.date, r.time)}`, { size: 10 });
    w.heading(`Articles (${r.items.length})`);
    for (const item of r.items) {
      const details = [
        item.cut && `Découpe : ${item.cut}`,
        item.portionGrams && `Poids cible : ${item.portionGrams} g par pièce`,
        item.packaging && `Conditionnement : ${item.packaging}`,
        item.note,
      ].filter(Boolean) as string[];
      const weight = indicativeWeight(item);
      if (weight && item.unit === "piece") details.push(`Poids total indicatif : ${weightLabel(weight)}`);
      w.ensure(18 + details.length * 12);
      const top = w.y;
      w.at(item.name, M, top - 10, 10.5, true);
      w.at(freeQuantity(item.quantity, item.unit), A4.w - M, top - 10, 10.5, true, INK, "right");
      w.y -= 16;
      for (const d of details) w.text(d, { x: M + 12, size: 9, color: MUTED });
      w.y -= 4;
    }
    if (r.instructions) {
      w.heading("Consignes de préparation et besoins particuliers");
      w.text(r.instructions, { size: 9.5 });
    }
  }
  w.footer(`${settings.name} — ${quote.id}`);
  return w.doc.save();
}

/** Devis établi par la boucherie, avec les mentions habituelles. */
export async function quoteDocument(quote: Quote, settings: Settings, draft: boolean) {
  if (!quote.number && !draft) return quoteRequestDocument(quote, settings);
  const w = await Writer.create();
  const legal = settings.legal;
  shopHeader(w, settings, draft && !quote.number ? "Projet de devis" : "Devis", quote.number ? `N° ${quote.number}` : `Brouillon ${quote.id}`);
  if (draft && !quote.number)
    w.text("Projet non établi : sans valeur commerciale.", { size: 9.5, bold: true, color: ACCENT, gap: 4 });

  const top = w.y;
  w.at("Vendeur", M, top - 10, 8.5, true, ACCENT);
  w.at(legal.company || settings.name, M, top - 23, 9.5, true);
  const seller = [
    legal.legalForm,
    settings.address,
    legal.siren ? `SIREN ${legal.siren}` : "",
  ].filter(Boolean);
  seller.forEach((line, n) => w.at(line, M, top - 35 - n * 11, 8.5, false, MUTED));
  const cx = A4.w / 2 + 10;
  w.at("Client", cx, top - 10, 8.5, true, ACCENT);
  w.at(quote.customer.company || quote.customer.name, cx, top - 23, 9.5, true);
  const client = [
    quote.customer.company ? quote.customer.name : "",
    quote.customer.address,
    quote.request?.pro?.siret ? `SIRET ${quote.request.pro.siret}` : "",
    quote.request?.pro?.vatNumber ? `TVA ${quote.request.pro.vatNumber}` : "",
  ].filter(Boolean);
  client.forEach((line, n) => w.at(line, cx, top - 35 - n * 11, 8.5, false, MUTED));
  w.y = top - 40 - Math.max(seller.length, client.length) * 11;
  const issued = quote.history.find((h) => h.status === "Devis établi")?.at || quote.updatedAt;
  w.text(
    `Date : ${new Date(issued).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" })}${quote.validUntil ? ` — Valable jusqu’au ${longDate(quote.validUntil)}` : ""}`,
    { size: 9.5, gap: 6 },
  );
  if (quote.request?.pro?.poReference)
    w.text(`Votre référence : ${quote.request.pro.poReference}`, { size: 9, color: MUTED, gap: 4 });

  // Tableau des lignes
  const cols = { qty: 330, pu: 400, vat: 450, total: A4.w - M };
  w.ensure(30);
  w.y -= 6;
  const head = w.y;
  w.at("Désignation", M, head - 10, 8.5, true, MUTED);
  w.at("Quantité", cols.qty, head - 10, 8.5, true, MUTED, "right");
  w.at("PU HT", cols.pu, head - 10, 8.5, true, MUTED, "right");
  w.at("TVA", cols.vat, head - 10, 8.5, true, MUTED, "right");
  w.at("Total HT", cols.total, head - 10, 8.5, true, MUTED, "right");
  w.y -= 14;
  w.rule(3);
  for (const line of quote.lines) {
    const designation = w.wrap(line.designation, w.regular, 9.5, cols.qty - M - 70);
    w.ensure(designation.length * 13 + 6);
    const y = w.y;
    designation.forEach((d, n) => w.at(d, M, y - 10 - n * 12.5, 9.5));
    const qty = `${String(line.quantity).replace(".", ",")} ${line.unit}`.trim();
    w.at(qty, cols.qty, y - 10, 9.5, false, INK, "right");
    w.at(money(line.unitPrice), cols.pu, y - 10, 9.5, false, INK, "right");
    w.at(rateLabel(line.vatRate), cols.vat, y - 10, 9.5, false, INK, "right");
    w.at(money(lineHT(line)), cols.total, y - 10, 9.5, false, INK, "right");
    w.y -= designation.length * 12.5 + 6;
  }
  w.rule(4);
  const totals = quoteTotals(quote.lines);
  const row = (label: string, value: string, bold = false) => {
    w.ensure(16);
    w.at(label, cols.vat, w.y - 10, bold ? 10.5 : 9.5, bold, INK, "right");
    w.at(value, cols.total, w.y - 10, bold ? 10.5 : 9.5, bold, INK, "right");
    w.y -= bold ? 17 : 14;
  };
  row("Total HT", money(totals.ht));
  for (const v of totals.vat) row(`TVA ${rateLabel(v.rate)}`, money(v.amount));
  row("Total TTC", money(totals.ttc), true);

  if (quote.message) {
    w.heading("Message");
    w.text(quote.message, { size: 9.5 });
  }
  w.heading("Conditions");
  w.text(quote.conditions || "—", { size: 9 });
  w.text("Devis gratuit. Les prix sont exprimés en euros.", { size: 9, color: MUTED, gap: 10 });
  w.ensure(60);
  w.text("Bon pour accord — date et signature du client :", { size: 9.5, bold: true, gap: 40 });
  w.footer(`${settings.name} — ${quote.number || quote.id}`);
  return w.doc.save();
}

export const pdfResponse = (bytes: Uint8Array, filename: string, download: boolean) =>
  new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${filename}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    },
  });

export { origins };
