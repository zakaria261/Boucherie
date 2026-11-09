import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, Clock3, MessageCircle, Store } from "lucide-react";
import { getOrder, getSettings } from "@/lib/server/db";
import { money } from "@/lib/shop";
import { statuses } from "@/lib/types";
import { orderWhatsAppMessage, whatsappLink } from "@/lib/whatsapp";
import { TrackingActions } from "@/components/order-tracking";
export const metadata = {
  title: "Suivi de votre demande | Boucherie du Faubourg",
  robots: { index: false, follow: false },
};
export default async function Suivi({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!/^[a-f0-9]{48}$/.test(token)) notFound();
  const order = getOrder(token);
  if (!order) notFound();
  const settings = getSettings();
  const index = statuses.indexOf(order.status);
  const origin = process.env.APP_ORIGIN?.replace(/\/$/, "");
  const ownerWhatsapp = whatsappLink(
    settings.whatsapp,
    orderWhatsAppMessage({
      id: order.id,
      name: order.name,
      date: new Date(order.date + "T12:00:00").toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
      total: money(order.total),
      items: order.items.map(
        (item) => `${item.quantity} × ${item.name} (${item.grams} g)`,
      ),
      trackingUrl: origin
        ? `${origin}/commande/suivi/${order.token}`
        : undefined,
    }),
  );
  return (
    <div className="tracking-page section">
      <div className="tracking-icon">
        {order.status === "Nouvelle" ? (
          <Clock3 size={30} />
        ) : (
          <Check size={30} />
        )}
      </div>
      <div className="eyebrow">DEMANDE {order.id}</div>
      <h1>
        {order.status === "Nouvelle"
          ? "Votre demande est bien reçue."
          : order.status === "Annulée"
            ? "Votre demande a été annulée."
            : order.status === "Retirée"
              ? "Merci, et bon appétit !"
              : "Votre artisan s’occupe de vous."}
      </h1>
      <p>
        {order.status === "Nouvelle"
          ? "Elle est enregistrée auprès de la boucherie. Votre artisan doit encore confirmer les disponibilités et votre retrait."
          : "Retrouvez ici l’avancement de votre demande. Contactez la boucherie pour toute précision."}
      </p>
      <div className="tracking-status">
        {order.status === "Annulée" ? (
          <strong>Annulée</strong>
        ) : (
          statuses.slice(0, 5).map((status, i) => (
            <div className={i <= index ? "done" : ""} key={status}>
              <span>{i < index ? <Check size={15} /> : i + 1}</span>
              <strong>{status}</strong>
            </div>
          ))
        )}
      </div>
      <div className="tracking-receipt">
        <div>
          <h2>Votre sélection</h2>
          <span>{order.id}</span>
        </div>
        {order.items.map((i) => (
          <div key={`${i.id}-${i.grams}`}>
            <span>
              {i.quantity} × {i.name}
              <small>{i.grams} g par portion</small>
            </span>
            <strong>{money(i.total)}</strong>
          </div>
        ))}
        <div className="order-total">
          <span>Total estimé</span>
          <strong>{money(order.total)}</strong>
        </div>
        <div className="tracking-pickup">
          <Store size={22} />
          <span>
            <strong>
              Retrait souhaité le{" "}
              {new Date(order.date + "T12:00:00").toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </strong>
            <small>{settings.address}</small>
          </span>
        </div>
      </div>
      <p className="tracking-note">
        Conservez ce lien privé pour suivre votre demande. Le suivi s’actualise
        automatiquement. Aucun paiement n’a été prélevé.
      </p>
      {ownerWhatsapp && (
        <div className="whatsapp-direct-card">
          <MessageCircle size={24} />
          <div>
            <strong>Envoyer votre demande à la boucherie sur WhatsApp</strong>
            <p>
              Votre message est déjà préparé avec votre sélection. Ouvrez
              WhatsApp puis appuyez sur Envoyer.
            </p>
            <a
              className="button whatsapp-button"
              href={ownerWhatsapp}
              target="_blank"
              rel="noreferrer"
            >
              Ouvrir WhatsApp <MessageCircle size={17} />
            </a>
          </div>
        </div>
      )}
      <TrackingActions />
      <Link className="text-link" href="/boutique">
        Retour à la boutique →
      </Link>
    </div>
  );
}
