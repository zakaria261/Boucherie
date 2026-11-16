import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CircleCheck, Download, FileText } from "lucide-react";
import { getQuoteByToken } from "@/lib/server/db";
import { publicQuote } from "@/lib/server/quotes";
import { freeQuantity, lineHT, quoteTotals, rateLabel } from "@/lib/requests";
import { formatTime, longDate, money } from "@/lib/shop";
import type { QuoteStatus } from "@/lib/types";
import { PrintButton } from "@/components/site/print-button";

export const metadata: Metadata = {
  title: "Demande de devis",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

const explain: Record<QuoteStatus, string> = {
  "Demande reçue": "Votre demande est enregistrée. La boucherie va l’étudier.",
  "En étude": "La boucherie étudie votre demande.",
  "Devis établi": "Votre devis est prêt. Contactez la boucherie pour l’accepter.",
  Envoyé: "Votre devis vous a été transmis. Contactez la boucherie pour l’accepter.",
  Accepté: "Devis accepté. La boucherie organise la préparation avec vous.",
  Refusé: "Ce devis n’a pas été retenu.",
  Expiré: "Ce devis a expiré. Contactez la boucherie pour une nouvelle proposition.",
  "Converti en commande": "Votre commande est enregistrée et sera préparée pour le retrait convenu.",
};

export default async function DevisPro({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { token } = await params;
  const { confirmation } = await searchParams;
  if (!/^[a-f0-9]{48}$/.test(token)) notFound();
  const stored = await getQuoteByToken(token);
  if (!stored) notFound();
  const quote = publicQuote(stored);
  const totals = quoteTotals(quote.lines);
  return (
    <div className="tracking page narrow">
      {confirmation === "1" && (
        <div className="confirm-banner" role="status">
          <CircleCheck size={28} />
          <div>
            <strong>Votre demande professionnelle a bien été reçue.</strong>
            <p>
              Notre équipe va l’étudier et vous recontacter pour confirmer les disponibilités, les tarifs et les
              modalités de retrait. Cet accusé de réception ne vaut pas acceptation de la commande.
            </p>
            <p className="confirm-ref">Référence {quote.id}</p>
          </div>
        </div>
      )}
      <header className="page-head">
        <span className="eyebrow">
          {quote.number ? `Devis ${quote.number}` : `Demande de devis · ${quote.id}`}
        </span>
        <h1>{quote.status}</h1>
        <p>{explain[quote.status]}</p>
      </header>

      {quote.number ? (
        <section className="card receipt">
          <h2>Votre devis</h2>
          <ul>
            {quote.lines.map((l, n) => (
              <li key={n}>
                <span>
                  <strong>{l.designation}</strong>
                  <small>
                    {String(l.quantity).replace(".", ",")} {l.unit} × {money(l.unitPrice)} HT · TVA {rateLabel(l.vatRate)}
                  </small>
                </span>
                <span>{money(lineHT(l))} HT</span>
              </li>
            ))}
          </ul>
          <div className="cart-total">
            <span>Total HT</span>
            <strong>{money(totals.ht)}</strong>
          </div>
          {totals.vat.map((v) => (
            <div className="cart-total sub" key={v.rate}>
              <span>TVA {rateLabel(v.rate)}</span>
              <span>{money(v.amount)}</span>
            </div>
          ))}
          <div className="cart-total">
            <span>Total TTC</span>
            <strong>{money(totals.ttc)}</strong>
          </div>
          {quote.validUntil && <p className="fine">Valable jusqu’au {longDate(quote.validUntil)}.</p>}
          {quote.conditions && <p className="fine">{quote.conditions}</p>}
        </section>
      ) : (
        quote.request && (
          <section className="paper-note pro printable" aria-label="Votre demande">
            <header>
              <FileText size={22} aria-hidden="true" />
              <div>
                <strong>Demande de devis</strong>
                <small>
                  {quote.customer.company} · {quote.customer.name}
                </small>
              </div>
            </header>
            {quote.request.date && (
              <p className="paper-slot">
                Retrait souhaité {longDate(quote.request.date)}
                {quote.request.time ? ` à ${formatTime(quote.request.time)}` : ""}
              </p>
            )}
            <ul>
              {quote.request.items.map((i, n) => (
                <li key={n}>
                  <span>
                    <strong>{i.name}</strong>
                    <small>
                      {[i.cut, i.portionGrams ? `${i.portionGrams} g par pièce` : "", i.packaging, i.note].filter(Boolean).join(" · ")}
                    </small>
                  </span>
                  <b>{freeQuantity(i.quantity, i.unit)}</b>
                </li>
              ))}
            </ul>
            {quote.request.instructions && (
              <p className="paper-notes">
                <strong>Consignes :</strong> {quote.request.instructions}
              </p>
            )}
          </section>
        )
      )}
      <div className="row-actions center no-print">
        <a className="button outline small" href={`/api/documents/devis/${token}?telecharger=1`} download>
          <Download size={16} /> Télécharger {quote.number ? "le devis" : "ma demande"}
        </a>
        <PrintButton label={quote.number ? "Imprimer le devis" : "Imprimer ma demande"} />
      </div>
      <p className="fine center">Gardez ce lien : il est personnel et permet de suivre votre demande.</p>
    </div>
  );
}
