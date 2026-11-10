import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, CircleCheck, MessageCircle, Navigation, Store, X } from "lucide-react";
import { getOrder, getSettings } from "@/lib/server/db";
import { formatTime, longDate, money, portionLabel } from "@/lib/shop";
import { statuses } from "@/lib/types";
import { orderWhatsAppMessage, whatsappLink } from "@/lib/whatsapp";
import { TrackingActions } from "@/components/site/order-tracking";
import { directionsUrl, siteUrl, telHref } from "@/lib/site";

export const metadata: Metadata = {
  title: "Suivi de commande",
  robots: { index: false, follow: false },
};

const headline: Record<string, string> = {
  Nouvelle: "Commande reçue",
  Confirmée: "Commande confirmée",
  "En préparation": "En préparation",
  Prête: "Votre commande est prête",
  Retirée: "Commande retirée, bon appétit !",
  Annulée: "Commande annulée",
};
const detail: Record<string, string> = {
  Nouvelle:
    "La boucherie l’a reçue dans son application et va la confirmer. Cette page se met à jour toute seule.",
  Confirmée: "La boucherie a validé votre commande. Elle sera préparée pour votre passage.",
  "En préparation": "Votre boucher est en train de préparer votre commande.",
  Prête: "Vous pouvez passer la récupérer. Le règlement se fait en boutique.",
  Retirée: "Merci pour votre visite.",
  Annulée:
    "Cette commande ne sera pas préparée. Contactez la boucherie pour toute question.",
};

export default async function Suivi({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { token } = await params;
  const { confirmation } = await searchParams;
  if (!/^[a-f0-9]{48}$/.test(token)) notFound();
  const order = getOrder(token);
  if (!order) notFound();
  const settings = getSettings();
  const pickup = `${longDate(order.date)}${order.time ? ` à ${formatTime(order.time)}` : ""}`;
  const whatsapp = whatsappLink(
    settings.whatsapp,
    orderWhatsAppMessage({
      id: order.id,
      name: order.name,
      date: pickup,
      total: money(order.total),
      items: order.items.map(
        (i) =>
          `${i.quantity} × ${i.name} (${portionLabel(i.unit, i.grams)})${
            i.options.length ? ` — ${i.options.join(", ")}` : ""
          }`,
      ),
      trackingUrl: `${siteUrl}/commande/suivi/${order.token}`,
    }),
  );
  const steps = statuses.slice(0, 5);
  const reached = (status: string) =>
    order.history.find((h) => h.status === status);
  const index = steps.indexOf(order.status as (typeof steps)[number]);

  return (
    <div className="tracking page narrow">
      {confirmation === "1" && order.status === "Nouvelle" && (
        <div className="confirm-banner" role="status">
          <CircleCheck size={28} />
          <div>
            <strong>Commande enregistrée</strong>
            <p>
              Référence <b>{order.id}</b>. La boucherie la voit dès maintenant
              dans son application : vous n’avez rien d’autre à faire.
            </p>
          </div>
        </div>
      )}
      <header className="page-head">
        <span className="eyebrow">Commande {order.id}</span>
        <h1>{headline[order.status]}</h1>
        <p>{detail[order.status]}</p>
      </header>

      {order.status === "Annulée" ? (
        <div className="status-cancelled">
          <X size={18} /> Annulée
        </div>
      ) : (
        <ol className="timeline" aria-label="Avancement">
          {steps.map((status, i) => {
            const event = reached(status);
            return (
              <li key={status} className={i <= index ? "done" : ""} aria-current={i === index ? "step" : undefined}>
                <span className="dot">{i < index ? <Check size={13} /> : null}</span>
                <span>
                  <strong>{status}</strong>
                  {event && i <= index && (
                    <small>
                      {new Date(event.at).toLocaleString("fr-FR", {
                        weekday: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone: "Europe/Paris",
                      })}
                    </small>
                  )}
                </span>
              </li>
            );
          })}
        </ol>
      )}

      <section className="card">
        <div className="pickup-place">
          <Store size={20} />
          <span>
            <strong>Retrait {pickup}</strong>
            <small>{settings.address}</small>
          </span>
        </div>
        <div className="row-actions">
          <a className="button outline small" href={directionsUrl(settings.address)} target="_blank" rel="noreferrer">
            <Navigation size={16} /> Itinéraire
          </a>
          {settings.phone && (
            <a className="button outline small" href={telHref(settings.phone)}>
              Appeler la boucherie
            </a>
          )}
        </div>
      </section>

      <section className="card receipt">
        <h2>Votre commande</h2>
        <ul>
          {order.items.map((i) => (
            <li key={`${i.id}-${i.grams}-${i.options.join()}`}>
              <span>
                <strong>
                  {i.quantity} × {i.name}
                </strong>
                <small>
                  {portionLabel(i.unit, i.grams)}
                  {i.options.length ? ` · ${i.options.join(" · ")}` : ""}
                </small>
              </span>
              <span>
                {i.regularPrice && (
                  <s>{money(Math.round((i.total * i.regularPrice) / i.price))}</s>
                )}
                {money(i.total)}
              </span>
            </li>
          ))}
        </ul>
        {order.notes && (
          <p className="notes">
            <strong>Vos précisions :</strong> {order.notes}
          </p>
        )}
        <div className="cart-total">
          <span>Total estimé</span>
          <strong>{money(order.total)}</strong>
        </div>
        <p className="fine">
          Aucun paiement n’a été effectué en ligne. Le montant final, calculé au
          poids préparé, est réglé en boutique.
        </p>
      </section>

      {whatsapp && order.status !== "Annulée" && order.status !== "Retirée" && (
        <section className="card whatsapp-card">
          <MessageCircle size={22} />
          <div>
            <strong>Facultatif : écrire aussi sur WhatsApp</strong>
            <p>
              Votre commande est déjà enregistrée. Si vous le souhaitez, ouvrez
              un message WhatsApp prérempli ; il ne sera envoyé que si vous
              appuyez sur Envoyer dans WhatsApp.
            </p>
            <a className="button whatsapp small" href={whatsapp} target="_blank" rel="noreferrer">
              Ouvrir WhatsApp
            </a>
          </div>
        </section>
      )}

      <TrackingActions items={order.items} />
      <p className="fine center">
        Gardez ce lien : il est personnel et permet de suivre votre commande.
        Retrouvez-le aussi dans <Link href="/mes-commandes">Mes commandes</Link>.
      </p>
    </div>
  );
}
