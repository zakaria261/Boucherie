"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronRight,
  Copy,
  ExternalLink,
  FileDown,
  FilePlus2,
  FileText,
  Plus,
  ShoppingBag,
  Trash2,
} from "lucide-react";
import { quoteTransitions, recurrences, type Quote, type QuoteLine, type QuoteStatus } from "@/lib/types";
import { effectiveQuoteStatus, freeQuantity, lineHT, quoteTotals, rateLabel, weightLabel, indicativeWeight } from "@/lib/requests";
import { formatTime, longDate, money, parisNow } from "@/lib/shop";
import { api, haptic } from "./api";
import { Empty, NavHeader, PUSH, Section, Segmented, Sheet, useHud, useScreenState } from "./ui";

const tones: Record<QuoteStatus, string> = {
  "Demande reçue": "orange",
  "En étude": "yellow",
  "Devis établi": "blue",
  Envoyé: "indigo",
  Accepté: "green",
  Refusé: "red",
  Expiré: "gray",
  "Converti en commande": "green",
};
export function QuotePill({ status }: { status: QuoteStatus }) {
  return <span className={`pill ${tones[status]}`}>{status}</span>;
}
const VAT = [550, 1000, 2000, 210, 0];
const actionLabels: Partial<Record<QuoteStatus, string>> = {
  "En étude": "Passer en étude",
  "Devis établi": "Établir le devis",
  Envoyé: "Marquer comme envoyé",
  Accepté: "Marquer comme accepté",
  Refusé: "Marquer comme refusé",
  Expiré: "Marquer comme expiré",
  "Demande reçue": "Repasser en demande",
};

type View = "a-traiter" | "en-cours" | "termines";
const groups: Record<View, QuoteStatus[]> = {
  "a-traiter": ["Demande reçue", "En étude"],
  "en-cours": ["Devis établi", "Envoyé", "Accepté"],
  termines: ["Refusé", "Expiré", "Converti en commande"],
};

export function QuotesScreen({ quotes }: { quotes: Quote[] }) {
  const router = useRouter();
  const today = parisNow().date;
  const [view, setView] = useScreenState<View>("quotes-view", "a-traiter");
  const [creating, setCreating] = useState(false);
  const [customer, setCustomer] = useState({ name: "", company: "", phone: "", email: "", address: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const list = quotes.filter((q) => (groups[view] || groups["a-traiter"]).includes(effectiveQuoteStatus(q, today)));
  const count = (v: View) => quotes.filter((q) => groups[v].includes(effectiveQuoteStatus(q, today))).length;

  return (
    <>
      <NavHeader
        title="Devis"
        back={{ href: "/admin/commandes", label: "Commandes" }}
        actions={
          <button type="button" className="nav-icon" aria-label="Nouveau devis" onClick={() => setCreating(true)}>
            <Plus size={26} />
          </button>
        }
      />
      <div className="content">
        <Segmented
          label="Étape"
          value={view in groups ? view : "a-traiter"}
          onChange={setView}
          options={[
            { value: "a-traiter", label: "À traiter", badge: count("a-traiter") },
            { value: "en-cours", label: "En cours" },
            { value: "termines", label: "Terminés" },
          ]}
        />
        {list.length ? (
          <div className="group-body">
            {list.map((q) => {
              const status = effectiveQuoteStatus(q, today);
              const priced = q.lines.length > 0 && q.lines.every((l) => l.unitPrice > 0);
              return (
                <Link transitionTypes={PUSH} key={q.id} href={`/admin/devis/${q.id}`} className="row product-row">
                  <span className="row-icon tone-blue">
                    <FileText size={17} />
                  </span>
                  <span className="row-text">
                    <span className="row-label">{q.customer.company || q.customer.name}</span>
                    <span className="row-detail">
                      {q.number || q.id} · {new Date(q.createdAt).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" })}
                      {priced ? ` · ${money(quoteTotals(q.lines).ttc)} TTC` : ""}
                    </span>
                    <span className="badges">
                      <QuotePill status={status} />
                      {q.companyId && <span className="pill pro">PRO</span>}
                    </span>
                  </span>
                  <ChevronRight className="row-chevron" size={18} />
                </Link>
              );
            })}
          </div>
        ) : (
          <Empty icon={<FileText size={34} />} title="Aucun devis">
            {view === "a-traiter" ? "Les demandes de devis des professionnels arrivent ici." : "Aucun devis à cette étape."}
          </Empty>
        )}
      </div>
      <Sheet open={creating} onClose={() => setCreating(false)} title="Nouveau devis">
        <form
          className="sheet-form"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              const { quote } = await api<{ quote: Quote }>("/api/admin/devis", "POST", { customer });
              router.push(`/admin/devis/${quote.id}`);
            } catch (err) {
              setError((err as Error).message);
              setBusy(false);
            }
          }}
        >
          {(["name", "company", "phone", "email", "address"] as const).map((k) => (
            <label className="field" key={k}>
              <span>{{ name: "Nom du client", company: "Entreprise (facultatif)", phone: "Téléphone", email: "E-mail", address: "Adresse" }[k]}</span>
              <input
                required={k === "name"}
                value={customer[k]}
                maxLength={k === "address" ? 300 : 150}
                onChange={(e) => setCustomer({ ...customer, [k]: e.target.value })}
              />
            </label>
          ))}
          {error && <p className="inline-error" role="alert">{error}</p>}
          <button className="btn filled large" disabled={busy}>
            <FilePlus2 size={18} /> Créer le devis
          </button>
        </form>
      </Sheet>
    </>
  );
}

type DraftLine = { designation: string; quantity: string; unit: string; price: string; vatRate: number };
const toDraft = (l: QuoteLine): DraftLine => ({
  designation: l.designation,
  quantity: String(l.quantity).replace(".", ","),
  unit: l.unit,
  price: l.unitPrice ? (l.unitPrice / 100).toFixed(2).replace(".", ",") : "",
  vatRate: l.vatRate,
});
const fromDraft = (l: DraftLine): QuoteLine => ({
  designation: l.designation.trim(),
  quantity: Number(l.quantity.replace(",", ".")),
  unit: l.unit.trim(),
  unitPrice: Math.round(Number((l.price || "0").replace(",", ".")) * 100),
  vatRate: l.vatRate,
});

export function QuoteEditor({ initial, clientUrl }: { initial: Quote; clientUrl: string }) {
  const router = useRouter();
  const [quote, setQuote] = useState(initial);
  const [lines, setLines] = useState<DraftLine[]>(initial.lines.map(toDraft));
  const [customer, setCustomer] = useState(initial.customer);
  const [validUntil, setValidUntil] = useState(initial.validUntil);
  const [conditions, setConditions] = useState(initial.conditions);
  const [message, setMessage] = useState(initial.message);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [convert, setConvert] = useState(false);
  const [pickup, setPickup] = useState({ date: initial.request?.date || parisNow().date, time: initial.request?.time || "" });
  const [note, setNote] = useState("");
  const { hud, show } = useHud();
  const today = parisNow().date;
  const status = effectiveQuoteStatus(quote, today);
  const editable = ["Demande reçue", "En étude", "Devis établi"].includes(status);
  const parsed = useMemo(() => lines.map(fromDraft), [lines]);
  const valid = parsed.every((l) => l.designation && Number.isFinite(l.quantity) && l.quantity > 0 && Number.isFinite(l.unitPrice));
  const totals = quoteTotals(valid ? parsed : []);
  const dirty =
    JSON.stringify(parsed) !== JSON.stringify(quote.lines) ||
    JSON.stringify(customer) !== JSON.stringify(quote.customer) ||
    validUntil !== quote.validUntil ||
    conditions !== quote.conditions ||
    message !== quote.message;

  async function run<T>(fn: () => Promise<T>, done?: string) {
    setBusy(true);
    setError("");
    try {
      const result = await fn();
      if (done) show(done);
      return result;
    } catch (e) {
      setError((e as Error).message);
      return null;
    } finally {
      setBusy(false);
    }
  }
  const save = () =>
    run(async () => {
      if (!valid) throw new Error("Vérifiez chaque ligne : désignation, quantité supérieure à zéro et prix.");
      const { quote: next } = await api<{ quote: Quote }>(`/api/admin/devis/${quote.id}`, "PUT", {
        version: quote.version,
        customer,
        lines: parsed,
        validUntil,
        conditions,
        message,
      });
      setQuote(next);
      return next;
    }, "Enregistré");
  const move = (to: QuoteStatus) =>
    run(async () => {
      let current = quote;
      if (dirty && editable) {
        const saved = await api<{ quote: Quote }>(`/api/admin/devis/${quote.id}`, "PUT", {
          version: quote.version,
          customer,
          lines: parsed,
          validUntil,
          conditions,
          message,
        });
        current = saved.quote;
      }
      const { quote: next } = await api<{ quote: Quote }>(`/api/admin/devis/${quote.id}`, "PATCH", { status: to, version: current.version });
      setQuote(next);
      haptic("success");
      router.refresh();
    }, to);

  const update = (n: number, patch: Partial<DraftLine>) => setLines(lines.map((l, i) => (i === n ? { ...l, ...patch } : l)));

  return (
    <>
      <NavHeader title={quote.number || "Devis"} large={false} back={{ href: "/admin/devis", label: "Devis" }} />
      <div className="content detail">
        <header className="detail-head">
          <div className="badges">
            <QuotePill status={status} />
            {quote.companyId && <span className="pill pro">PRO</span>}
          </div>
          <h1>{quote.customer.company || quote.customer.name}</h1>
          <p className="detail-sub">
            {quote.number ? `Devis ${quote.number}` : `Référence ${quote.id} · numéro attribué à l’établissement`}
          </p>
        </header>

        {quote.request && (
          <Section title="Demande du client" footer="Demande d’origine, conservée telle quelle. Elle ne vaut pas devis.">
            {quote.request.items.map((i, n) => {
              const w = i.unit === "piece" ? indicativeWeight(i) : null;
              return (
                <div className="row" key={n}>
                  <span className="row-text">
                    <span className="row-label">{i.name}</span>
                    <span className="row-detail">
                      {[freeQuantity(i.quantity, i.unit), i.cut, i.portionGrams && `${i.portionGrams} g/pièce`, w && `≈ ${weightLabel(w)}`, i.packaging, i.note]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                </div>
              );
            })}
            {quote.request.instructions && (
              <div className="row">
                <span className="row-text">
                  <span className="row-detail">Consignes</span>
                  <span className="row-label">{quote.request.instructions}</span>
                </span>
              </div>
            )}
            {(quote.request.date || quote.request.pro) && (
              <div className="row">
                <span className="row-text">
                  <span className="row-detail">Retrait souhaité · besoin</span>
                  <span className="row-label">
                    {quote.request.date ? `${longDate(quote.request.date)}${quote.request.time ? ` à ${formatTime(quote.request.time)}` : ""}` : "Date à convenir"}
                    {quote.request.pro ? ` · ${quote.request.pro.slotMode} · ${recurrences[quote.request.pro.recurrence]}` : ""}
                    {quote.request.pro?.covers ? ` · ${quote.request.pro.covers} couverts` : ""}
                  </span>
                </span>
              </div>
            )}
            {quote.companyId && (
              <Link transitionTypes={PUSH} href={`/admin/clients/${quote.companyId}`} className="row">
                <span className="row-text">
                  <span className="row-label">Fiche du client professionnel</span>
                </span>
                <ChevronRight className="row-chevron" size={18} />
              </Link>
            )}
          </Section>
        )}

        <Section title="Client">
          {(["name", "company", "phone", "email", "address"] as const).map((k) => (
            <label className="field" key={k}>
              <span>{{ name: "Nom", company: "Entreprise", phone: "Téléphone", email: "E-mail", address: "Adresse" }[k]}</span>
              <input disabled={!editable} value={customer[k]} onChange={(e) => setCustomer({ ...customer, [k]: e.target.value })} />
            </label>
          ))}
        </Section>

        <Section title="Lignes du devis" footer="Prix unitaires hors taxes. Aucune ligne ne peut rester sans prix à l’établissement.">
          {lines.map((l, n) => (
            <div className="quote-line" key={n}>
              <input
                className="quote-designation"
                aria-label={`Désignation ligne ${n + 1}`}
                placeholder="Désignation"
                disabled={!editable}
                value={l.designation}
                maxLength={160}
                onChange={(e) => update(n, { designation: e.target.value })}
              />
              <div className="quote-numbers">
                <label>
                  <span>Qté</span>
                  <input inputMode="decimal" disabled={!editable} value={l.quantity} onChange={(e) => update(n, { quantity: e.target.value.replace(/[^\d,.]/g, "") })} />
                </label>
                <label>
                  <span>Unité</span>
                  <input disabled={!editable} value={l.unit} maxLength={20} onChange={(e) => update(n, { unit: e.target.value })} />
                </label>
                <label>
                  <span>PU HT €</span>
                  <input inputMode="decimal" disabled={!editable} value={l.price} placeholder="À fixer" onChange={(e) => update(n, { price: e.target.value.replace(/[^\d,.]/g, "") })} />
                </label>
                <label>
                  <span>TVA</span>
                  <select disabled={!editable} value={l.vatRate} onChange={(e) => update(n, { vatRate: Number(e.target.value) })}>
                    {VAT.map((r) => (
                      <option key={r} value={r}>
                        {rateLabel(r)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="quote-line-foot">
                <span>{valid && parsed[n].unitPrice > 0 ? `${money(lineHT(parsed[n]))} HT` : "Prix à fixer"}</span>
                {editable && (
                  <span className="quote-line-actions">
                    <button type="button" aria-label="Monter" disabled={n === 0} onClick={() => setLines(swap(lines, n, n - 1))}>
                      <ArrowUp size={16} />
                    </button>
                    <button type="button" aria-label="Descendre" disabled={n === lines.length - 1} onClick={() => setLines(swap(lines, n, n + 1))}>
                      <ArrowDown size={16} />
                    </button>
                    <button type="button" aria-label="Dupliquer" onClick={() => setLines([...lines.slice(0, n + 1), { ...l }, ...lines.slice(n + 1)])}>
                      <Copy size={16} />
                    </button>
                    <button type="button" aria-label="Supprimer la ligne" onClick={() => setLines(lines.filter((_, i) => i !== n))}>
                      <Trash2 size={16} />
                    </button>
                  </span>
                )}
              </div>
            </div>
          ))}
          {editable && (
            <button type="button" className="row add-row" onClick={() => setLines([...lines, { designation: "", quantity: "1", unit: "kg", price: "", vatRate: 550 }])}>
              <Plus size={18} /> Ajouter une ligne
            </button>
          )}
          <div className="row total-row">
            <span className="row-text">
              <span className="row-label">Total HT</span>
            </span>
            <span className="row-value">{money(totals.ht)}</span>
          </div>
          {totals.vat.map((v) => (
            <div className="row" key={v.rate}>
              <span className="row-text">
                <span className="row-detail">TVA {rateLabel(v.rate)}</span>
              </span>
              <span className="row-value">{money(v.amount)}</span>
            </div>
          ))}
          <div className="row total-row">
            <span className="row-text">
              <span className="row-label">Total TTC</span>
            </span>
            <span className="row-value strong">{money(totals.ttc)}</span>
          </div>
        </Section>

        <Section title="Conditions">
          <label className="field">
            <span>Valable jusqu’au</span>
            <input type="date" disabled={!editable} min={today} value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
          </label>
          <label className="field">
            <span>Conditions</span>
            <textarea rows={3} disabled={!editable} maxLength={1500} value={conditions} onChange={(e) => setConditions(e.target.value)} />
          </label>
          <label className="field">
            <span>Message au client (facultatif)</span>
            <textarea rows={2} disabled={!editable} maxLength={1500} value={message} onChange={(e) => setMessage(e.target.value)} />
          </label>
        </Section>

        <Section title="Documents">
          <a className="row" href={`/api/admin/devis/${quote.id}/pdf`} target="_blank" rel="noreferrer">
            <span className="row-icon tone-red">
              <FileDown size={17} />
            </span>
            <span className="row-text">
              <span className="row-label">{quote.number ? "PDF du devis" : "Aperçu PDF (projet)"}</span>
            </span>
            <ExternalLink className="row-chevron" size={16} />
          </a>
          <button
            type="button"
            className="row"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(clientUrl);
                show("Lien copié");
              } catch {
                setError(clientUrl);
              }
            }}
          >
            <span className="row-icon tone-blue">
              <Copy size={17} />
            </span>
            <span className="row-text">
              <span className="row-label">Copier le lien client</span>
              <span className="row-detail">Le client y voit sa demande, puis le devis une fois établi.</span>
            </span>
          </button>
          {quote.orderId && (
            <Link transitionTypes={PUSH} href={`/admin/commandes/${quote.orderId}`} className="row">
              <span className="row-icon tone-green">
                <ShoppingBag size={17} />
              </span>
              <span className="row-text">
                <span className="row-label">Commande {quote.orderId}</span>
              </span>
              <ChevronRight className="row-chevron" size={18} />
            </Link>
          )}
        </Section>

        <Section title="Notes internes" footer="Échanges, disponibilités, tarifs convenus : jamais visibles par le client.">
          {quote.internalNotes.map((n) => (
            <div className="row note-row" key={n.id}>
              <span className="row-text">
                <span className="row-label">{n.text}</span>
                <span className="row-detail">
                  {n.by} · {new Date(n.at).toLocaleString("fr-FR", { timeZone: "Europe/Paris" })}
                </span>
              </span>
            </div>
          ))}
          <form
            className="note-form"
            onSubmit={async (e) => {
              e.preventDefault();
              const result = await run(() => api<{ quote: Quote }>(`/api/admin/devis/${quote.id}/notes`, "POST", { text: note }), "Note ajoutée");
              if (result) {
                setQuote({ ...quote, internalNotes: result.quote.internalNotes });
                setNote("");
              }
            }}
          >
            <textarea rows={2} maxLength={2000} aria-label="Nouvelle note interne" value={note} onChange={(e) => setNote(e.target.value)} />
            <button className="btn tinted small" disabled={busy || !note.trim()}>
              Ajouter la note
            </button>
          </form>
        </Section>

        <Section title="Historique">
          {quote.history.map((h, n) => (
            <div className="row" key={n}>
              <span className="row-text">
                <span className="row-label">{h.status}</span>
                {h.by && <span className="row-detail">{h.by}</span>}
              </span>
              <span className="row-value">{new Date(h.at).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" })}</span>
            </div>
          ))}
        </Section>

        <div className="detail-secondary">
          {quoteTransitions[status]
            .filter((s) => s !== "Converti en commande")
            .map((s) => (
              <button key={s} type="button" className={`btn ${s === "Refusé" ? "plain destructive-text" : "tinted"}`} disabled={busy} onClick={() => void move(s)}>
                {actionLabels[s] || s}
              </button>
            ))}
        </div>
        {error && <p className="inline-error" role="alert">{error}</p>}
      </div>

      {((editable && dirty) || status === "Accepté") && (
        <div className="action-bar">
          {status === "Accepté" ? (
            <button type="button" className="btn filled large" disabled={busy} onClick={() => setConvert(true)}>
              Convertir en commande
            </button>
          ) : (
            <button type="button" className="btn filled large" disabled={busy} onClick={() => void save()}>
              {busy ? "Enregistrement…" : "Enregistrer le devis"}
            </button>
          )}
        </div>
      )}

      <Sheet open={convert} onClose={() => setConvert(false)} title="Convertir en commande">
        <form
          className="sheet-form"
          onSubmit={async (e) => {
            e.preventDefault();
            const result = await run(() =>
              api<{ quote: Quote; order: { id: string } }>(`/api/admin/devis/${quote.id}/convertir`, "POST", { version: quote.version, ...pickup }),
            );
            if (result) {
              haptic("success");
              router.push(`/admin/commandes/${result.order.id}`);
            }
          }}
        >
          <p className="sheet-text">La commande reprend les lignes et les prix du devis, qui reste conservé. Une seule conversion est possible.</p>
          <label className="field">
            <span>Date de retrait</span>
            <input type="date" required min={today} value={pickup.date} onChange={(e) => setPickup({ ...pickup, date: e.target.value })} />
          </label>
          <label className="field">
            <span>Heure (facultatif)</span>
            <input type="time" step={300} value={pickup.time} onChange={(e) => setPickup({ ...pickup, time: e.target.value })} />
          </label>
          {error && <p className="inline-error" role="alert">{error}</p>}
          <button className="btn filled large" disabled={busy}>
            Créer la commande
          </button>
        </form>
      </Sheet>
      {hud}
    </>
  );
}

function swap<T>(list: T[], a: number, b: number) {
  const next = [...list];
  [next[a], next[b]] = [next[b], next[a]];
  return next;
}
