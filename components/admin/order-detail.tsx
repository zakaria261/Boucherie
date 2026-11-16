"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Building2,
  CalendarClock,
  ChevronRight,
  FileText,
  ImageIcon,
  MessageCircle,
  MessageSquareText,
  Phone,
  Printer,
  StickyNote,
} from "lucide-react";
import { isFree, origins, preparing, recurrences, transitions, type Order, type OrderItem, type OrderStatus } from "@/lib/types";
import { amountLabel, freeQuantity, indicativeWeight, itemLabel, orderTotal, weightLabel } from "@/lib/requests";
import { formatTime, longDate, money, portionLabel } from "@/lib/shop";
import { whatsappLink } from "@/lib/whatsapp";
import { api, haptic } from "./api";
import { Empty, NavHeader, PUSH, Section, Sheet, StatusPill, useHud } from "./ui";
import { useOrders } from "./shell";
import { dayName, isRequest, nextAction, OriginBadge } from "./order-utils";

const delivery: Record<string, string> = {
  sent: "envoyé",
  "not-configured": "non configuré",
  "not-requested": "non demandé",
  failed: "échec de l’envoi",
};
const when = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris",
  });
const euros = (cents: number | null | undefined) =>
  cents === null || cents === undefined ? "" : (cents / 100).toFixed(2).replace(".", ",");

function details(item: OrderItem) {
  if (!isFree(item)) return item.options;
  const weight = item.unit === "piece" ? indicativeWeight(item) : null;
  return [
    item.cut && `Découpe : ${item.cut}`,
    item.portionGrams && `Poids cible : ${item.portionGrams} g par pièce`,
    weight && `≈ ${weightLabel(weight)} au total`,
    item.packaging && `Conditionnement : ${item.packaging}`,
    item.note,
  ].filter(Boolean) as string[];
}

export function OrderDetail({ initial, shopName }: { initial: Order; shopName: string }) {
  const { orders, setStatus, replace, refresh } = useOrders();
  const order = orders.find((o) => o.id === initial.id) || initial;
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [sheet, setSheet] = useState<"" | "status" | "cancel" | "pickup">(""),
    [paid, setPaid] = useState(""),
    [line, setLine] = useState<number | null>(null),
    [note, setNote] = useState(""),
    [pending, setPending] = useState<Record<number, boolean>>({});
  const { hud, show } = useHud();
  const action = nextAction[order.status];
  const allowed = transitions[order.status];
  const canPrepare = preparing.includes(order.status);
  const done = order.items.filter((i) => i.prepared).length;
  const finalTotal = orderTotal(order.items);

  // Synchronisation entre collaborateurs : la fiche ouverte se met à jour
  // toutes les 8 secondes tant qu'elle est visible.
  useEffect(() => {
    const tick = () => document.visibilityState === "visible" && void refresh();
    const timer = setInterval(tick, 8000);
    return () => clearInterval(timer);
  }, [refresh]);

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

  async function prep(index: number, patch: Record<string, unknown>) {
    setError("");
    setPending((p) => ({ ...p, [index]: true }));
    const before = order;
    // Case cochée immédiatement à l'écran ; annulée si le serveur refuse.
    if (typeof patch.prepared === "boolean")
      replace({ ...order, items: order.items.map((it, i) => (i === index ? { ...it, prepared: patch.prepared as boolean } : it)) });
    try {
      const { order: next } = await api<{ order: Order }>(
        `/api/admin/orders/${order.id}/lignes/${index}`,
        "PATCH",
        { name: order.items[index].name, ...patch },
      );
      replace(next);
      if (patch.prepared) haptic("light");
      return true;
    } catch (e) {
      replace(before);
      setError((e as Error).message);
      return false;
    } finally {
      setPending((p) => ({ ...p, [index]: false }));
    }
  }

  async function addNote(e: React.FormEvent) {
    e.preventDefault();
    if (!note.trim()) return;
    setBusy(true);
    try {
      const { order: next } = await api<{ order: Order }>(`/api/admin/orders/${order.id}/notes`, "POST", { text: note });
      replace(next);
      setNote("");
      show("Note ajoutée");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const pickup = `${dayName(order.date)}${order.time ? ` à ${formatTime(order.time)}` : ""}`;
  const title = order.pro?.company || order.name;
  const message = `Bonjour ${order.firstName || order.name}, c’est ${shopName}. ${
    order.status === "Prête"
      ? `Votre commande ${order.id} est prête, vous pouvez passer la récupérer.`
      : order.status === "Annulée"
        ? `Votre commande ${order.id} a été annulée. N’hésitez pas à nous appeler.`
        : isRequest(order)
          ? `Nous avons bien reçu votre demande ${order.id} pour un retrait ${pickup.toLowerCase()}.`
          : `Votre commande ${order.id} est confirmée pour un retrait ${pickup.toLowerCase()}.`
  }`;
  const wa = whatsappLink(order.phone, message);
  const tel = order.phone.replace(/[^+\d]/g, "");
  const current = line !== null ? order.items[line] : null;

  return (
    <>
      <NavHeader
        title={order.id}
        large={false}
        back={{ href: "/admin/commandes", label: "Commandes" }}
        actions={
          <button type="button" className="nav-icon" aria-label="Imprimer la fiche de préparation" onClick={() => window.print()}>
            <Printer size={21} />
          </button>
        }
      />
      <div className="content detail">
        <header className="detail-head">
          <div className="badges">
            <StatusPill status={order.status} />
            <OriginBadge order={order} />
          </div>
          <h1>{title}</h1>
          {order.pro && <p className="detail-sub">{order.pro.contactName}</p>}
          <p className="pickup-big">
            <CalendarClock size={20} />
            {pickup}
            {order.pro?.slotMode === "flexible" && <span className="pill gray">flexible</span>}
          </p>
          <p className="detail-sub">
            {origins[order.origin]} · reçue le {when(order.createdAt)}
          </p>
        </header>

        {isRequest(order) && (
          <p className="callout info" role="note">
            {order.origin === "catalogue"
              ? "Commande du site à accepter : elle n’est pas encore confirmée au client."
              : "Demande à valider : vérifiez la disponibilité, contactez le client si besoin, puis acceptez-la. Elle n’entre en préparation qu’après acceptation."}
          </p>
        )}

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
              <strong>{order.pro ? "Consignes de préparation" : "Instructions du client"}</strong>
              <p>{order.notes}</p>
            </div>
          </div>
        )}

        {order.mediaId && (
          <a className="photo-source" href={`/api/admin/media/${order.mediaId}`} target="_blank" rel="noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/admin/media/${order.mediaId}`} alt="Photo d’origine de la commande" />
            <span>
              <ImageIcon size={16} /> Photo d’origine
            </span>
          </a>
        )}

        <Section
          title={`${canPrepare ? "Préparation" : "Articles"} · ${done}/${order.items.length}`}
          footer={
            canPrepare
              ? "Cochez chaque article préparé : l’état est partagé avec toute l’équipe. Cocher ne change pas le statut de la commande."
              : "Acceptez la commande pour commencer la préparation."
          }
        >
          {order.items.map((item, index) => {
            const extra = details(item);
            const qty = isFree(item) ? freeQuantity(item.quantity, item.unit) : `${item.quantity} × ${portionLabel(item.unit, item.grams)}`;
            return (
              <div className={`prep-line checkable ${item.prepared ? "is-done" : ""}`} key={index}>
                <label className="prep-check">
                  <input
                    type="checkbox"
                    checked={!!item.prepared}
                    disabled={!canPrepare}
                    aria-busy={pending[index] || undefined}
                    aria-label={`${item.name} préparé`}
                    onChange={(e) => !pending[index] && void prep(index, { prepared: e.target.checked })}
                  />
                </label>
                <button type="button" className="prep-body" onClick={() => setLine(index)} aria-label={`Détails de ${item.name}`}>
                  <span className="row-text">
                    <span className="row-label">{item.name}</span>
                    <span className="prep-qty-text">{qty}</span>
                    {extra.length > 0 && <span className="prep-options">{extra.join(" · ")}</span>}
                    {(item.preparedWeight || item.substitution) && (
                      <span className="row-detail">
                        {item.preparedWeight ? `Préparé : ${weightLabel(item.preparedWeight)}` : ""}
                        {item.preparedWeight && item.substitution ? " · " : ""}
                        {item.substitution ? `Remplacé par : ${item.substitution}` : ""}
                      </span>
                    )}
                    {!isFree(item) && item.regularPrice && <span className="row-detail">Prix promotionnel appliqué</span>}
                  </span>
                  <span className="row-value">{amountLabel(item.finalPrice ?? item.total)}</span>
                </button>
              </div>
            );
          })}
          <div className="row total-row">
            <span className="row-text">
              <span className="row-label">{finalTotal === order.total ? "Total estimé" : "Total"}</span>
              {finalTotal === null && <span className="row-detail">Saisissez le prix des articles libres</span>}
            </span>
            <span className="row-value strong">{amountLabel(finalTotal ?? order.total)}</span>
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

        {order.pro && (
          <Section title="Professionnel">
            {order.companyId && (
              <Link transitionTypes={PUSH} href={`/admin/clients/${order.companyId}`} className="row">
                <span className="row-icon tone-indigo">
                  <Building2 size={17} />
                </span>
                <span className="row-text">
                  <span className="row-label">{order.pro.company}</span>
                  <span className="row-detail">Fiche client · {order.pro.activity === "Autre" && order.pro.activityOther ? order.pro.activityOther : order.pro.activity}</span>
                </span>
                <ChevronRight className="row-chevron" size={18} />
              </Link>
            )}
            <Info label="Identifiant">
              {order.pro.siret
                ? `SIRET ${order.pro.siret}`
                : order.pro.noSiret
                  ? `Sans SIRET — ${order.pro.noSiretReason}`
                  : `${order.pro.country}${order.pro.foreignId ? ` — ${order.pro.foreignId}` : ""}`}
            </Info>
            {order.pro.vatNumber && <Info label="TVA intracommunautaire">{order.pro.vatNumber}</Info>}
            {order.pro.poReference && <Info label="Référence client">{order.pro.poReference}</Info>}
            {order.pro.billingAddress && <Info label="Facturation">{order.pro.billingAddress}</Info>}
            {order.pro.pickupContact && <Info label="Retrait par">{order.pro.pickupContact}</Info>}
            {order.pro.eventDate && <Info label="Événement">{longDate(order.pro.eventDate)}</Info>}
            {order.pro.covers && <Info label="Couverts">{order.pro.covers}</Info>}
            <Info label="Besoin">
              {recurrences[order.pro.recurrence]}
              {order.pro.recurrenceDetail ? ` — ${order.pro.recurrenceDetail}` : ""}
            </Info>
            <Info label="Préférence de contact">{order.pro.contactPreference}</Info>
          </Section>
        )}
        {order.quoteId && (
          <Section>
            <Link transitionTypes={PUSH} href={`/admin/devis/${order.quoteId}`} className="row">
              <span className="row-icon tone-blue">
                <FileText size={17} />
              </span>
              <span className="row-text">
                <span className="row-label">Devis d’origine</span>
              </span>
              <ChevronRight className="row-chevron" size={18} />
            </Link>
          </Section>
        )}

        <Section title="Client">
          <a className="row" href={`tel:${tel}`}>
            <span className="row-text">
              <span className="row-detail">{order.name}</span>
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

        <Section title="Notes internes" footer="Visibles uniquement par l’équipe, jamais par le client.">
          {(order.internalNotes || []).map((n) => (
            <div className="row note-row" key={n.id}>
              <span className="row-text">
                <span className="row-label">{n.text}</span>
                <span className="row-detail">
                  {n.by} · {when(n.at)}
                </span>
              </span>
            </div>
          ))}
          <form className="note-form" onSubmit={addNote}>
            <textarea
              rows={2}
              maxLength={2000}
              placeholder="Appel du client, disponibilité, tarif convenu…"
              aria-label="Nouvelle note interne"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <button className="btn tinted small" disabled={busy || !note.trim()}>
              Ajouter la note
            </button>
          </form>
        </Section>

        <Section title="Historique">
          {order.history.map((h, n) => (
            <div className="row" key={n}>
              <span className="row-text">
                <span className="row-label">{h.status}</span>
                {h.by && <span className="row-detail">{h.by}</span>}
              </span>
              <span className="row-value">{when(h.at)}</span>
            </div>
          ))}
        </Section>

        <Section title="Notifications" footer="Les envois automatiques ne sont tentés que si les canaux sont configurés.">
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
        {!allowed.length && <Empty title={order.status === "Retirée" ? "Commande terminée" : "Commande annulée"} />}
        {error && !sheet && line === null && (
          <p className="inline-error" role="alert">
            {error}
          </p>
        )}
      </div>

      {action && (
        <div className="action-bar">
          <button
            type="button"
            className="btn filled large"
            disabled={busy}
            onClick={() => (action.status === "Retirée" ? setSheet("pickup") : void change(action.status))}
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
          La commande {order.id} de {title} sera annulée. Les quantités réservées reviennent en stock. Pensez à prévenir
          le client.
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
            const value = paid.trim() ? Math.round(Number(paid.replace(",", ".")) * 100) : undefined;
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
              placeholder={euros(finalTotal ?? order.total) || "0,00"}
              value={paid}
              onChange={(e) => setPaid(e.target.value)}
            />
            <small>Sert de base à la fidélité : seuls les montants réellement payés comptent.</small>
          </label>
          {error && <p className="inline-error" role="alert">{error}</p>}
          <button className="btn filled large" disabled={busy}>
            Confirmer le retrait
          </button>
        </form>
      </Sheet>

      {current && line !== null && (
        <LineSheet
          key={`${order.id}-${line}`}
          item={current}
          editable={canPrepare}
          onClose={() => {
            setLine(null);
            setError("");
          }}
          error={error}
          onSave={async (patch) => {
            if (await prep(line, patch)) {
              setLine(null);
              show("Enregistré");
            }
          }}
        />
      )}

      {hud}

      <div className="print-ticket" aria-hidden="true">
        <h2>Fiche de préparation — {order.id}</h2>
        <p>
          <strong>{title}</strong>
          {order.pro ? ` (${order.pro.contactName})` : ""}
          <br />
          Retrait : {longDate(order.date)}
          {order.time ? ` à ${formatTime(order.time)}` : ""}
          {order.pro?.slotMode === "flexible" ? " (flexible)" : ""}
        </p>
        <table>
          <tbody>
            {order.items.map((i, n) => (
              <tr key={n}>
                <td>{i.prepared ? "☑" : "☐"}</td>
                <td>
                  {itemLabel(i)}
                  {details(i).length > 0 && <div>→ {details(i).join(", ")}</div>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {order.notes && <p>Consignes : {order.notes}</p>}
      </div>
    </>
  );
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="row">
      <span className="row-text">
        <span className="row-detail">{label}</span>
        <span className="row-label">{children}</span>
      </span>
    </div>
  );
}

/** Détails d'une ligne : poids préparé, remplacement, prix final. */
function LineSheet({
  item,
  editable,
  onClose,
  onSave,
  error,
}: {
  item: OrderItem;
  editable: boolean;
  onClose: () => void;
  onSave: (patch: Record<string, unknown>) => Promise<void>;
  error: string;
}) {
  const [weight, setWeight] = useState(item.preparedWeight ? String(item.preparedWeight) : "");
  const [substitution, setSubstitution] = useState(item.substitution || "");
  const [price, setPrice] = useState(euros(item.finalPrice ?? null));
  const [busy, setBusy] = useState(false);
  const [local, setLocal] = useState("");
  const dirty =
    weight !== (item.preparedWeight ? String(item.preparedWeight) : "") ||
    substitution !== (item.substitution || "") ||
    price !== euros(item.finalPrice ?? null);
  return (
    <Sheet open onClose={onClose} title={item.name} dirty={dirty}>
      <p className="sheet-text">
        Demandé : {isFree(item) ? freeQuantity(item.quantity, item.unit) : `${item.quantity} × ${portionLabel(item.unit, item.grams)}`}
        {item.total !== null && ` · estimé ${money(item.total)}`}
      </p>
      {details(item).length > 0 && <p className="sheet-text muted">{details(item).join(" · ")}</p>}
      {editable ? (
        <form
          className="sheet-form"
          onSubmit={async (e) => {
            e.preventDefault();
            setLocal("");
            const grams = weight.trim() ? Number(weight) : null;
            const cents = price.trim() ? Math.round(Number(price.replace(",", ".")) * 100) : null;
            if (grams !== null && (!Number.isInteger(grams) || grams <= 0)) return setLocal("Poids invalide (en grammes).");
            if (cents !== null && (!Number.isFinite(cents) || cents < 0)) return setLocal("Prix invalide.");
            setBusy(true);
            await onSave({ preparedWeight: grams, substitution, finalPrice: cents });
            setBusy(false);
          }}
        >
          <label className="field">
            <span>Poids réellement préparé (g)</span>
            <input inputMode="numeric" value={weight} onChange={(e) => setWeight(e.target.value.replace(/\D/g, ""))} />
          </label>
          <label className="field">
            <span>Remplacement éventuel</span>
            <input value={substitution} maxLength={200} placeholder="Produit proposé à la place" onChange={(e) => setSubstitution(e.target.value)} />
          </label>
          <label className="field">
            <span>Prix final de la ligne (€)</span>
            <input inputMode="decimal" value={price} placeholder="À confirmer" onChange={(e) => setPrice(e.target.value.replace(/[^\d,.]/g, ""))} />
            <small>Laissez vide tant que le prix n’est pas connu : il reste « à confirmer », jamais 0 €.</small>
          </label>
          {(local || error) && <p className="inline-error" role="alert">{local || error}</p>}
          <button className="btn filled large" disabled={busy}>
            {busy ? "Enregistrement…" : "Enregistrer"}
          </button>
        </form>
      ) : (
        <p className="sheet-text">Acceptez la commande pour renseigner la préparation.</p>
      )}
    </Sheet>
  );
}
