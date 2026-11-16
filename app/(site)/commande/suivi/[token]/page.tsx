import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Check,
  CircleCheck,
  MessageCircle,
  Navigation,
  Store,
  X,
} from "lucide-react";
import { getOrder, getSettings } from "@/lib/server/db";
import { formatTime, longDate, money, portionLabel } from "@/lib/shop";
import { origins, type OrderItem, type OrderStatus, type Order } from "@/lib/types";
import { amountLabel, freeQuantity, itemLabel } from "@/lib/requests";
import { publicOrder } from "@/lib/server/orders";
import { ShoppingNote } from "@/components/site/shopping-note";

const reachedStatus = (order: Order, status: OrderStatus) =>
  order.status === status || order.history.some((h) => h.status === status);
import { orderWhatsAppMessage, whatsappLink } from "@/lib/whatsapp";
import { TrackingActions } from "@/components/site/order-tracking";
import { directionsUrl, siteUrl, telHref } from "@/lib/site";

export const metadata: Metadata = {
  title: "Suivi de commande",
  robots: { index: false, follow: false },
};

const headline: Record<OrderStatus, string> = {
  "Demande reçue": "Demande reçue",
  "En attente de validation": "En attente de validation",
  Acceptée: "Commande acceptée",
  "En préparation": "En préparation",
  Prête: "Votre commande est prête",
  Retirée: "Commande retirée, bon appétit !",
  Annulée: "Commande annulée",
};
const detail: Record<OrderStatus, string> = {
  "Demande reçue":
    "La boucherie l’a reçue dans son application et va la vérifier. Cette page se met à jour toute seule.",
  "En attente de validation":
    "La boucherie étudie votre demande et vous contactera si une précision est nécessaire.",
  Acceptée: "La boucherie a validé votre commande. Elle sera préparée pour votre passage.",
  "En préparation": "Votre boucher est en train de préparer votre commande.",
  Prête: "Vous pouvez passer la récupérer. Le règlement se fait en boutique.",
  Retirée: "Merci pour votre visite.",
  Annulée: "Cette commande ne sera pas préparée. Contactez la boucherie pour toute question.",
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
  const order = await getOrder(token);
  if (!order) notFound();
  const settings = await getSettings();
  const pickup = `${longDate(order.date)}${order.time ? ` à ${formatTime(order.time)}` : ""}`;
  const whatsapp = whatsappLink(
    settings.whatsapp,
    orderWhatsAppMessage({
      id: order.id,
      name: order.name,
      date: pickup,
      total: amountLabel(order.total),
      items: order.items.map(itemLabel),
      trackingUrl: `${siteUrl}/commande/suivi/${order.token}`,
    }),
  );
  const steps: OrderStatus[] = [
    "Demande reçue",
    ...(reachedStatus(order, "En attente de validation") ? (["En attente de validation"] as const) : []),
    "Acceptée",
    "En préparation",
    "Prête",
    "Retirée",
  ];
  const reached = (status: string) => order.history.find((h) => h.status === status);
  const index = steps.indexOf(order.status);
  const free = order.origin === "liste" || order.origin === "pro";
  const confirmed = confirmation === "1" && order.status !== "Annulée";

  return (
    <div className="tracking page narrow">
      {confirmed && order.origin === "liste" && (
        <div className="confirm-banner" role="status">
          <CircleCheck size={28} />
          <div>
            <strong>Votre demande de commande a bien été reçue !</strong>
            <p>
              Merci pour votre confiance ! Notre équipe va vérifier votre demande et la disponibilité des produits pour
              le créneau souhaité. Nous vous contacterons si une précision ou une modification est nécessaire.
            </p>
            <p className="confirm-ref">Référence {order.id}</p>
          </div>
        </div>
      )}
      {confirmed && order.origin === "pro" && (
        <div className="confirm-banner" role="status">
          <CircleCheck size={28} />
          <div>
            <strong>Votre demande professionnelle a bien été reçue.</strong>
            <p>
              Notre équipe va l’étudier et vous recontacter pour confirmer les disponibilités, les tarifs et les
              modalités de retrait. Cet accusé de réception ne vaut pas acceptation de la commande.
            </p>
            <p className="confirm-ref">Référence {order.id}</p>
          </div>
        </div>
      )}
      {confirmed && !free && (
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
        <span className="eyebrow">
          {origins[order.origin]} · {order.id}
        </span>
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
              <li
                key={status}
                className={i <= index ? "done" : ""}
                aria-current={i === index ? "step" : undefined}
              >
                <span className="dot">
                  {i < index ? <Check size={13} /> : null}
                </span>
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
          <a
            className="button outline small"
            href={directionsUrl(settings.address)}
            target="_blank"
            rel="noreferrer"
          >
            <Navigation size={16} /> Itinéraire
          </a>
          {settings.phone && (
            <a className="button outline small" href={telHref(settings.phone)}>
              Appeler la boucherie
            </a>
          )}
        </div>
      </section>

      {free ? (
        <ShoppingNote
          token={order.token}
          reference={order.id}
          title={order.origin === "liste" ? "Ma liste de courses" : "Demande de commande — en attente de validation"}
          items={publicOrder(order).items as OrderItem[]}
          date={order.date}
          time={order.time}
          notes={order.notes}
          documentLabel={order.origin === "liste" ? "ma liste" : "ma demande"}
        />
      ) : (
        <section className="card receipt">
          <h2>Votre commande</h2>
          <ul>
            {order.items.map((i, n) => (
              <li key={n}>
                <span>
                  <strong>{i.kind === "libre" ? i.name : `${i.quantity} × ${i.name}`}</strong>
                  <small>
                    {i.kind === "libre"
                      ? freeQuantity(i.quantity, i.unit)
                      : `${portionLabel(i.unit, i.grams)}${i.options.length ? ` · ${i.options.join(" · ")}` : ""}`}
                  </small>
                </span>
                <span>
                  {i.kind !== "libre" && i.regularPrice && (
                    <s>{money(Math.round((i.total * i.regularPrice) / i.price))}</s>
                  )}
                  {amountLabel(i.total)}
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
            <strong>{amountLabel(order.total)}</strong>
          </div>
          <p className="fine">
            Aucun paiement n’a été effectué en ligne. Le montant final, calculé au
            poids préparé, est réglé en boutique.
          </p>
        </section>
      )}
      {free && (
        <p className="commercial-note">
          Les produits sont soumis à disponibilité. Les prix et le montant final seront confirmés par la boucherie selon
          les articles et les poids préparés. Paiement lors du retrait.
        </p>
      )}

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
            <a
              className="button whatsapp small"
              href={whatsapp}
              target="_blank"
              rel="noreferrer"
            >
              Ouvrir WhatsApp
            </a>
          </div>
        </section>
      )}

      <TrackingActions items={order.items} printable={!free} />
      <p className="fine center">
        Gardez ce lien : il est personnel et permet de suivre votre commande.
        Retrouvez-le aussi dans <Link href="/mes-commandes">Mes commandes</Link>
        .
      </p>
    </div>
  );
}
