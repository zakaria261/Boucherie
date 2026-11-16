"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Building2, ChevronRight, Copy, FilePlus2, Plus, Search, Trash2, X } from "lucide-react";
import type { Company, Order, Quote } from "@/lib/types";
import { amountLabel, effectiveQuoteStatus } from "@/lib/requests";
import { parisNow } from "@/lib/shop";
import { api } from "./api";
import { Empty, NavHeader, PUSH, Section, Segmented, StatusPill, Toggle, useHud, useScreenState } from "./ui";
import { QuotePill } from "./quotes";

export function ClientsScreen({ companies }: { companies: Company[] }) {
  const [search, setSearch] = useScreenState("clients-search", "");
  const [view, setView] = useScreenState<"tous" | "a-verifier">("clients-view", "tous");
  const q = search.trim().toLowerCase();
  const list = companies.filter(
    (c) =>
      (view === "tous" || c.status === "À vérifier") &&
      (!q ||
        c.name.toLowerCase().includes(q) ||
        c.siret.includes(q.replace(/\s/g, "")) ||
        c.contacts.some((k) => k.name.toLowerCase().includes(q) || k.email.toLowerCase().includes(q) || k.phone.replace(/\D/g, "").includes(q.replace(/\D/g, "") || "§"))),
  );
  return (
    <>
      <NavHeader title="Clients pro" back={{ href: "/admin/plus", label: "Plus" }} />
      <div className="content">
        <div className="search-bar">
          <Search size={17} aria-hidden="true" />
          <input type="search" placeholder="Entreprise, contact, SIRET" aria-label="Rechercher un client" value={search} onChange={(e) => setSearch(e.target.value)} />
          {search && (
            <button type="button" aria-label="Effacer" onClick={() => setSearch("")}>
              <X size={15} />
            </button>
          )}
        </div>
        <Segmented
          label="Filtre"
          value={view}
          onChange={setView}
          options={[
            { value: "tous", label: "Tous" },
            { value: "a-verifier", label: "À vérifier", badge: companies.filter((c) => c.status === "À vérifier").length },
          ]}
        />
        {list.length ? (
          <div className="group-body">
            {list.map((c) => (
              <Link transitionTypes={PUSH} key={c.id} href={`/admin/clients/${c.id}`} className="row product-row">
                <span className="row-icon tone-indigo">
                  <Building2 size={17} />
                </span>
                <span className="row-text">
                  <span className="row-label">{c.name}</span>
                  <span className="row-detail">
                    {c.activity} · {c.contacts[0]?.name || "—"}
                  </span>
                  <span className="badges">
                    <span className={`pill ${c.status === "Vérifiée" ? "green" : "orange"}`}>{c.status}</span>
                  </span>
                </span>
                <ChevronRight className="row-chevron" size={18} />
              </Link>
            ))}
          </div>
        ) : (
          <Empty icon={<Building2 size={34} />} title="Aucun client professionnel">
            Les fiches sont créées à la première demande d’un professionnel.
          </Empty>
        )}
      </div>
    </>
  );
}

export function ClientDetail({
  initial,
  orders,
  quotes,
  spaceUrl,
}: {
  initial: Company;
  orders: Order[];
  quotes: Quote[];
  spaceUrl: string;
}) {
  const router = useRouter();
  const [company, setCompany] = useState(initial);
  const [draft, setDraft] = useState(initial);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { hud, show } = useHud();
  const today = parisNow().date;
  const dirty = JSON.stringify(draft) !== JSON.stringify(company);

  async function run(fn: () => Promise<void>, done: string) {
    setBusy(true);
    setError("");
    try {
      await fn();
      show(done);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <NavHeader title={company.name} large={false} back={{ href: "/admin/clients", label: "Clients pro" }} />
      <div className="content detail">
        <header className="detail-head">
          <div className="badges">
            <span className="pill pro">PRO</span>
            <span className={`pill ${company.status === "Vérifiée" ? "green" : "orange"}`}>{company.status}</span>
          </div>
          <h1>{company.name}</h1>
          <p className="detail-sub">
            {company.activity} · {company.country} ·{" "}
            {company.siret ? `SIRET ${company.siret}` : company.noSiretReason ? `Sans SIRET — ${company.noSiretReason}` : company.foreignId || "Identifiant non communiqué"}
          </p>
        </header>

        <Section title="Fiche" footer="« Vérifiée » signifie que vous avez contrôlé la structure vous-même : le site ne vérifie que le format du SIRET.">
          <label className="field">
            <span>Nom</span>
            <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </label>
          <label className="field">
            <span>Adresse de facturation</span>
            <input value={draft.billingAddress} onChange={(e) => setDraft({ ...draft, billingAddress: e.target.value })} />
          </label>
          <label className="field">
            <span>TVA intracommunautaire</span>
            <input value={draft.vatNumber} onChange={(e) => setDraft({ ...draft, vatNumber: e.target.value })} />
          </label>
          <Toggle
            label="Structure vérifiée"
            checked={draft.status === "Vérifiée"}
            onChange={(v) => setDraft({ ...draft, status: v ? "Vérifiée" : "À vérifier" })}
          />
          <label className="field">
            <span>Conditions commerciales convenues (interne)</span>
            <textarea rows={3} maxLength={2000} value={draft.conditions} onChange={(e) => setDraft({ ...draft, conditions: e.target.value })} />
          </label>
        </Section>

        <Section title="Contacts">
          {draft.contacts.map((c, n) => (
            <div className="contact-edit" key={n}>
              <input aria-label="Nom du contact" placeholder="Nom" value={c.name} onChange={(e) => setDraft({ ...draft, contacts: draft.contacts.map((x, i) => (i === n ? { ...x, name: e.target.value } : x)) })} />
              <input aria-label="Téléphone du contact" placeholder="Téléphone" type="tel" value={c.phone} onChange={(e) => setDraft({ ...draft, contacts: draft.contacts.map((x, i) => (i === n ? { ...x, phone: e.target.value } : x)) })} />
              <input aria-label="E-mail du contact" placeholder="E-mail" type="email" value={c.email} onChange={(e) => setDraft({ ...draft, contacts: draft.contacts.map((x, i) => (i === n ? { ...x, email: e.target.value } : x)) })} />
              {draft.contacts.length > 1 && (
                <button type="button" className="icon-plain" aria-label="Retirer ce contact" onClick={() => setDraft({ ...draft, contacts: draft.contacts.filter((_, i) => i !== n) })}>
                  <Trash2 size={17} />
                </button>
              )}
            </div>
          ))}
          <button type="button" className="row add-row" onClick={() => setDraft({ ...draft, contacts: [...draft.contacts, { name: "", phone: "", email: "" }] })}>
            <Plus size={18} /> Ajouter un contact
          </button>
        </Section>

        <Section title="Commandes">
          {orders.length ? (
            orders.map((o) => (
              <Link transitionTypes={PUSH} key={o.id} href={`/admin/commandes/${o.id}`} className="row">
                <span className="row-text">
                  <span className="row-label">
                    {o.id} · {new Date(`${o.date}T12:00:00Z`).toLocaleDateString("fr-FR", { timeZone: "UTC" })}
                  </span>
                  <span className="row-detail">
                    {o.items.length} article{o.items.length > 1 ? "s" : ""} · {amountLabel(o.total)}
                  </span>
                </span>
                <StatusPill status={o.status} />
              </Link>
            ))
          ) : (
            <div className="row">
              <span className="row-detail">Aucune commande.</span>
            </div>
          )}
        </Section>

        <Section title="Devis">
          {quotes.map((q) => (
            <Link transitionTypes={PUSH} key={q.id} href={`/admin/devis/${q.id}`} className="row">
              <span className="row-text">
                <span className="row-label">{q.number || q.id}</span>
                <span className="row-detail">{new Date(q.createdAt).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" })}</span>
              </span>
              <QuotePill status={effectiveQuoteStatus(q, today)} />
            </Link>
          ))}
          <button
            type="button"
            className="row add-row"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                const contact = company.contacts[0] || { name: company.name, phone: "", email: "" };
                const { quote } = await api<{ quote: Quote }>("/api/admin/devis", "POST", {
                  companyId: company.id,
                  customer: { name: contact.name, company: company.name, phone: contact.phone, email: contact.email, address: company.billingAddress },
                });
                router.push(`/admin/devis/${quote.id}`);
              }, "Devis créé")
            }
          >
            <FilePlus2 size={18} /> Nouveau devis pour ce client
          </button>
        </Section>

        <Section title="Espace professionnel" footer="Lien privé : le client y consulte uniquement ses propres demandes et devis, et peut mettre à jour ses coordonnées.">
          <button
            type="button"
            className="row"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(spaceUrl);
                show("Lien copié");
              } catch {
                setError(spaceUrl);
              }
            }}
          >
            <span className="row-icon tone-blue">
              <Copy size={17} />
            </span>
            <span className="row-text">
              <span className="row-label">Copier le lien de l’espace pro</span>
            </span>
          </button>
        </Section>

        <Section title="Notes internes" footer="Jamais visibles par le client.">
          {company.internalNotes.map((n) => (
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
            onSubmit={(e) => {
              e.preventDefault();
              void run(async () => {
                const result = await api<{ company: Company }>(`/api/admin/clients/${company.id}/notes`, "POST", { text: note });
                setCompany(result.company);
                setDraft({ ...draft, internalNotes: result.company.internalNotes });
                setNote("");
              }, "Note ajoutée");
            }}
          >
            <textarea rows={2} maxLength={2000} aria-label="Nouvelle note interne" value={note} onChange={(e) => setNote(e.target.value)} />
            <button className="btn tinted small" disabled={busy || !note.trim()}>
              Ajouter la note
            </button>
          </form>
        </Section>
        {error && <p className="inline-error" role="alert">{error}</p>}
      </div>
      {dirty && (
        <div className="action-bar">
          <button
            type="button"
            className="btn filled large"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                const result = await api<{ company: Company }>(`/api/admin/clients/${company.id}`, "PUT", draft);
                setCompany(result.company);
                setDraft(result.company);
              }, "Enregistré")
            }
          >
            Enregistrer la fiche
          </button>
        </div>
      )}
      {hud}
    </>
  );
}
