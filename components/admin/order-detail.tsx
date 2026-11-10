"use client";
import { useState } from "react";
import {
  CalendarClock,
  MessageCircle,
  MessageSquareText,
  Phone,
  Printer,
  StickyNote,
} from "lucide-react";
import { transitions, type Order, type OrderStatus } from "@/lib/types";
import { formatTime, longDate, money, portionLabel } from "@/lib/shop";
import { whatsappLink } from "@/lib/whatsapp";
import { Empty, NavHeader, Section, Sheet, StatusPill, useHud } from "./ui";
import { useOrders } from "./shell";
import { dayName, nextAction } from "./order-utils";

const delivery: Record<string, string> = {
  sent: "envoyé",
  "not-configured": "non configuré",
  "not-requested": "non demandé",
  failed: "échec de l’envoi",
};

export function OrderDetail({ initial, shopName }: { initial: Order; shopName: string }) {
  const { orders, setStatus } = useOrders();
  const order = orders.find((o) => o.id === initial.id) || initial;
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [sheet, setSheet] = useState<"" | "status" | "cancel" | "pickup">(""),
    [paid, setPaid] = useState("");
  const { hud, show } = useHud();
  const action = nextAction[order.status];
  const allowed = transitions[order.status];

  async function change(status: OrderStatus, paidAmount?: number) {
    setBusy(true);
    setError("");
    try {
      await setStatus(order, status, paidAmount);
      setSheet("");
      show(status);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const pickup = `${dayName(order.date)}${order.time ? ` à ${formatTime(order.time)}` : ""}`;
  const message = `Bonjour ${order.name}, c’est ${shopName}. ${
    order.status === "Prête"
      ? `Votre commande ${order.id} est prête, vous pouvez passer la récupérer.`
      : order.status === "Annulée"
        ? `Votre commande ${order.id} a été annulée. N’hésitez pas à nous appeler.`
        : `Nous avons bien votre commande ${order.id} pour un retrait ${pickup.toLowerCase()}.`
  }`;
  const wa = whatsappLink(order.phone, message);
  const tel = order.phone.replace(/[^+\d]/g, "");

  return (
    <>
      <NavHeader
        title={order.id.replace("FB-", "#")}
        large={false}
        back={{ href: "/admin/commandes", label: "Commandes" }}
        actions={
          <button type="button" className="nav-icon" aria-label="Imprimer le ticket" onClick={() => window.print()}>
            <Printer size={21} />
          </button>
        }
      />
      <div className="content detail">
        <header className="detail-head">
          <StatusPill status={order.status} />
          <h1>{order.name}</h1>
          <p className="pickup-big">
            <CalendarClock size={20} />
            {pickup}
          </p>
          <p className="detail-sub">
            {order.id} · reçue le{" "}
            {new Date(order.createdAt).toLocaleString("fr-FR", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
              timeZone: "Europe/Paris",
            })}
          </p>
        </header>

        <div className="contact-actions">
          <a className="contact-action" href={`tel:${tel}`}>
            <Phone size={22} />
            <span>Appeler</span>
          </a>
          {wa && (
            <a className="contact-action" href={wa} target="_blank" rel="noreferrer">
              <MessageCircle size={22} />
              <span>WhatsApp</span>
            </a>
          )}
          <a className="contact-action" href={`sms:${tel}&body=${encodeURIComponent(message)}`}>
            <MessageSquareText size={22} />
            <span>SMS</span>
          </a>
        </div>

        {order.notes && (
          <div className="instructions" role="note">
            <StickyNote size={20} />
            <div>
              <strong>Instructions du client</strong>
              <p>{order.notes}</p>
            </div>
          </div>
        )}

        <Section title={`À préparer · ${order.items.length} produit${order.items.length > 1 ? "s" : ""}`}>
          {order.items.map((i) => (
            <div className="prep-line" key={`${i.id}-${i.grams}-${i.options.join()}`}>
              <span className="prep-qty">{i.quantity}×</span>
              <span className="row-text">
                <span className="row-label">
                  {portionLabel(i.unit, i.grams)} · {i.name}
                </span>
                {i.options.length > 0 && (
                  <span className="prep-options">{i.options.join(" · ")}</span>
                )}
                {i.regularPrice && <span className="row-detail">Prix promotionnel appliqué</span>}
              </span>
              <span className="row-value">{money(i.total)}</span>
            </div>
          ))}
          <div className="row total-row">
            <span className="row-text">
              <span className="row-label">Total estimé</span>
            </span>
            <span className="row-value strong">{money(order.total)}</span>
          </div>
          {order.paidAmount !== undefined && (
            <div className="row">
              <span className="row-text">
                <span className="row-label">Encaissé en boutique</span>
              </span>
              <span className="row-value">{money(order.paidAmount)}</span>
            </div>
          )}
        </Section>

        <Section title="Client">
          <a className="row" href={`tel:${tel}`}>
            <span className="row-text">
              <span className="row-detail">Téléphone</span>
              <span className="row-label link">{order.phone}</span>
            </span>
          </a>
          {order.email && (
            <a className="row" href={`mailto:${order.email}`}>
              <span className="row-text">
                <span className="row-detail">E-mail</span>
                <span className="row-label link">{order.email}</span>
              </span>
            </a>
          )}
        </Section>

        <Section title="Historique">
          {order.history.map((h, n) => (
            <div className="row" key={n}>
              <span className="row-text">
                <span className="row-label">{h.status}</span>
              </span>
              <span className="row-value">
                {new Date(h.at).toLocaleString("fr-FR", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                  timeZone: "Europe/Paris",
                })}
              </span>
            </div>
          ))}
        </Section>

        <Section
          title="Notifications"
          footer="Les envois automatiques ne sont tentés que si les canaux sont configurés."
        >
          <div className="row">
            <span className="row-text">
              <span className="row-label">Notification sur vos appareils</span>
            </span>
            <span className="row-value">{delivery[order.push || "not-configured"]}</span>
          </div>
          <div className="row">
            <span className="row-text">
              <span className="row-label">WhatsApp automatique au client</span>
            </span>
            <span className="row-value">
              {delivery[order.whatsappNotifications?.status || order.whatsappNotifications?.customer || "not-configured"]}
            </span>
          </div>
        </Section>

        {allowed.length > 0 && (
          <div className="detail-secondary">
            {allowed.filter((s) => s !== "Annulée" && s !== action?.status).length > 0 && (
              <button type="button" className="btn plain" onClick={() => setSheet("status")}>
                Changer le statut…
              </button>
            )}
            {allowed.includes("Annulée") && (
              <button type="button" className="btn plain destructive-text" onClick={() => setSheet("cancel")}>
                Annuler la commande
              </button>
            )}
          </div>
        )}
        {!allowed.length && (
          <Empty title={order.status === "Retirée" ? "Commande terminée" : "Commande annulée"} />
        )}
        {error && !sheet && <p className="inline-error" role="alert">{error}</p>}
      </div>

      {action && (
        <div className="action-bar">
          <button
            type="button"
            className="btn filled large"
            disabled={busy}
            onClick={() =>
              action.status === "Retirée" ? setSheet("pickup") : void change(action.status)
            }
          >
            {busy ? "Enregistrement…" : action.label}
          </button>
        </div>
      )}

      <Sheet open={sheet === "status"} onClose={() => setSheet("")} title="Changer le statut">
        <div className="group-body">
          {allowed
            .filter((s) => s !== "Annulée")
            .map((s) => (
              <button key={s} type="button" className="row" disabled={busy} onClick={() => void change(s)}>
                <span className="row-text">
                  <span className="row-label">{s}</span>
                </span>
                <StatusPill status={s} />
              </button>
            ))}
        </div>
        {error && <p className="inline-error" role="alert">{error}</p>}
      </Sheet>

      <Sheet open={sheet === "cancel"} onClose={() => setSheet("")} title="Annuler la commande">
        <p className="sheet-text">
          La commande {order.id} de {order.name} sera annulée. Les quantités
          réservées reviennent en stock. Pensez à prévenir le client.
        </p>
        {error && <p className="inline-error" role="alert">{error}</p>}
        <div className="sheet-buttons">
          <button type="button" className="btn destructive large" disabled={busy} onClick={() => void change("Annulée")}>
            Annuler la commande
          </button>
          <button type="button" className="btn tinted large" onClick={() => setSheet("")}>
            Garder la commande
          </button>
        </div>
      </Sheet>

      <Sheet open={sheet === "pickup"} onClose={() => setSheet("")} title="Commande retirée">
        <form
          className="sheet-form"
          onSubmit={(e) => {
            e.preventDefault();
            const value = paid.trim()
              ? Math.round(Number(paid.replace(",", ".")) * 100)
              : undefined;
            if (value !== undefined && (!Number.isFinite(value) || value < 0)) {
              setError("Montant invalide.");
              return;
            }
            void change("Retirée", value);
          }}
        >
          <label className="field">
            <span>Montant encaissé (facultatif)</span>
            <input
              inputMode="decimal"
              placeholder={(order.total / 100).toFixed(2).replace(".", ",")}
              value={paid}
              onChange={(e) => setPaid(e.target.value)}
            />
            <small>Utile plus tard pour la fidélité, basée sur les montants réellement payés.</small>
          </label>
          {error && <p className="inline-error" role="alert">{error}</p>}
          <button className="btn filled large" disabled={busy}>
            Confirmer le retrait
          </button>
        </form>
      </Sheet>

      {hud}

      <div className="print-ticket" aria-hidden="true">
        <h2>{shopName}</h2>
        <p>
          <strong>{order.id}</strong> — {order.name}
          <br />
          {order.phone}
          <br />
          Retrait : {longDate(order.date)}
          {order.time ? ` à ${formatTime(order.time)}` : ""}
        </p>
        <table>
          <tbody>
            {order.items.map((i) => (
              <tr key={`${i.id}-${i.grams}-${i.options.join()}`}>
                <td>{i.quantity}×</td>
                <td>
                  {portionLabel(i.unit, i.grams)} {i.name}
                  {i.options.length > 0 && <div>→ {i.options.join(", ")}</div>}
                </td>
                <td>☐</td>
              </tr>
            ))}
          </tbody>
        </table>
        {order.notes && <p>Note : {order.notes}</p>}
        <p>Total estimé : {money(order.total)}</p>
      </div>
    </>
  );
}
