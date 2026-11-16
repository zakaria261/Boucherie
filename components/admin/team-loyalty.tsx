"use client";
import { useEffect, useState } from "react";
import { Award, Search, Trash2, UserPlus, Users } from "lucide-react";
import type { LoyaltyAccount, LoyaltySettings } from "@/lib/types";
import { api } from "./api";
import { Empty, NavHeader, Section, Sheet, Toggle, useHud } from "./ui";

type Account = LoyaltyAccount & { balance: number };
const when = (iso: string | number) =>
  new Date(iso).toLocaleString("fr-FR", { day: "numeric", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });

/** Programme de fidélité : règles (propriétaire) et comptes clients. */
export function LoyaltyScreen({ initial, owner }: { initial: LoyaltySettings; owner: boolean }) {
  const [rules, setRules] = useState(initial);
  const [draft, setDraft] = useState({ ...initial, approved: false });
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<Account | null>(null);
  const [adjust, setAdjust] = useState({ points: "", reason: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { hud, show } = useHud();

  useEffect(() => {
    const timer = setTimeout(() => {
      api<{ accounts: Account[] }>(`/api/admin/fidelite?q=${encodeURIComponent(q)}`)
        .then((r) => setAccounts(r.accounts))
        .catch((e) => setError((e as Error).message));
    }, 250);
    return () => clearTimeout(timer);
  }, [q, rules]);

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
  const num = (v: unknown) => Number(String(v).replace(",", "."));

  return (
    <>
      <NavHeader title="Fidélité" large={false} back={{ href: "/admin/plus", label: "Plus" }} />
      <div className="content">
        <Section
          title="Règles du programme"
          footer={
            rules.enabled
              ? `Programme actif depuis le ${new Date(rules.approvedAt).toLocaleDateString("fr-FR")}. Les points sont crédités sur le montant encaissé saisi au retrait, une seule fois par commande.`
              : "Programme désactivé : aucun point n’est attribué et rien n’est affiché aux clients tant que vous n’avez pas validé vos règles."
          }
        >
          <label className="field">
            <span>Points par euro payé</span>
            <input inputMode="decimal" disabled={!owner} value={String(draft.pointsPerEuro)} onChange={(e) => setDraft({ ...draft, pointsPerEuro: e.target.value as unknown as number })} />
          </label>
          <label className="field">
            <span>Seuil de la récompense (points)</span>
            <input inputMode="numeric" disabled={!owner} value={String(draft.threshold)} onChange={(e) => setDraft({ ...draft, threshold: e.target.value as unknown as number })} />
          </label>
          <label className="field">
            <span>Récompense</span>
            <input disabled={!owner} maxLength={200} value={draft.reward} placeholder="Décrite par vous, ex. : ce que vous offrez" onChange={(e) => setDraft({ ...draft, reward: e.target.value })} />
          </label>
          <label className="field">
            <span>Expiration après N mois sans achat (0 : jamais)</span>
            <input inputMode="numeric" disabled={!owner} value={String(draft.validityMonths)} onChange={(e) => setDraft({ ...draft, validityMonths: e.target.value as unknown as number })} />
          </label>
          <label className="field">
            <span>Exclusions et conditions</span>
            <textarea rows={2} disabled={!owner} maxLength={600} value={draft.exclusions} onChange={(e) => setDraft({ ...draft, exclusions: e.target.value })} />
          </label>
          {owner && (
            <>
              <Toggle label="Programme actif" checked={draft.enabled} onChange={(v) => setDraft({ ...draft, enabled: v })} />
              {draft.enabled && !rules.enabled && (
                <Toggle label="Je valide ces règles" detail="Elles seront affichées aux clients." checked={draft.approved} onChange={(v) => setDraft({ ...draft, approved: v })} />
              )}
            </>
          )}
        </Section>
        {owner && (
          <button
            type="button"
            className="btn filled large"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                const { rules: next } = await api<{ rules: LoyaltySettings }>("/api/admin/fidelite", "PUT", {
                  ...draft,
                  pointsPerEuro: num(draft.pointsPerEuro),
                  threshold: num(draft.threshold),
                  validityMonths: num(draft.validityMonths),
                  approved: draft.approved || rules.enabled,
                });
                setRules(next);
                setDraft({ ...next, approved: false });
              }, "Règles enregistrées")
            }
          >
            Enregistrer les règles
          </button>
        )}

        <Section title="Clients">
          <div className="search-bar inset">
            <Search size={17} aria-hidden="true" />
            <input type="search" placeholder="Nom ou téléphone" aria-label="Rechercher un client fidélité" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          {accounts.length ? (
            accounts.map((a) => (
              <button type="button" key={a.phone} className="row" onClick={() => setOpen(a)}>
                <span className="row-icon tone-yellow">
                  <Award size={17} />
                </span>
                <span className="row-text">
                  <span className="row-label">{a.name || a.phone}</span>
                  <span className="row-detail">{a.phone}</span>
                </span>
                <span className="row-value">{a.balance} pts</span>
              </button>
            ))
          ) : (
            <div className="row">
              <span className="row-detail">{rules.enabled ? "Aucun compte : ils sont créés au premier retrait payé." : "Aucun compte."}</span>
            </div>
          )}
        </Section>
        {error && !open && <p className="inline-error" role="alert">{error}</p>}
      </div>

      <Sheet open={!!open} onClose={() => setOpen(null)} title={open?.name || "Client"}>
        {open && (
          <>
            <p className="sheet-text">
              {open.phone} · <strong>{open.balance} points</strong>
              {rules.threshold ? ` · récompense à ${rules.threshold} points` : ""}
            </p>
            <div className="group-body">
              {[...open.transactions].reverse().slice(0, 30).map((t) => (
                <div className="row" key={t.id}>
                  <span className="row-text">
                    <span className="row-label">{t.reason}</span>
                    <span className="row-detail">
                      {t.type} · {t.by} · {when(t.at)}
                    </span>
                  </span>
                  <span className="row-value">{t.points > 0 ? `+${t.points}` : t.points}</span>
                </div>
              ))}
            </div>
            <form
              className="sheet-form"
              onSubmit={(e) => {
                e.preventDefault();
                void run(async () => {
                  const { account } = await api<{ account: LoyaltyAccount }>(`/api/admin/fidelite/${open.phone}`, "POST", {
                    type: "ajustement",
                    points: Number(adjust.points),
                    reason: adjust.reason,
                  });
                  setOpen({ ...account, balance: open.balance + Number(adjust.points) });
                  setAdjust({ points: "", reason: "" });
                  setRules({ ...rules });
                }, "Ajustement enregistré");
              }}
            >
              <label className="field">
                <span>Ajustement (points, négatif pour retirer)</span>
                <input inputMode="numeric" value={adjust.points} onChange={(e) => setAdjust({ ...adjust, points: e.target.value.replace(/[^\d-]/g, "") })} />
              </label>
              <label className="field">
                <span>Motif (obligatoire)</span>
                <input maxLength={200} value={adjust.reason} onChange={(e) => setAdjust({ ...adjust, reason: e.target.value })} />
              </label>
              {error && <p className="inline-error" role="alert">{error}</p>}
              <button className="btn tinted large" disabled={busy || !adjust.points || adjust.reason.trim().length < 3 || !rules.enabled}>
                Enregistrer l’ajustement
              </button>
              <button
                type="button"
                className="btn filled large"
                disabled={busy || !rules.enabled || open.balance < rules.threshold}
                onClick={() =>
                  void run(async () => {
                    const { account } = await api<{ account: LoyaltyAccount }>(`/api/admin/fidelite/${open.phone}`, "POST", { type: "utilisation" });
                    setOpen({ ...account, balance: open.balance - rules.threshold });
                    setRules({ ...rules });
                  }, "Récompense utilisée")
                }
              >
                Utiliser la récompense ({rules.reward || "non définie"})
              </button>
            </form>
          </>
        )}
      </Sheet>
      {hud}
    </>
  );
}

type Member = { id: number; email: string; role: string; name: string };

/** Comptes de l'équipe (propriétaire uniquement). */
export function TeamScreen({ selfId }: { selfId: number }) {
  const [team, setTeam] = useState<Member[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { hud, show } = useHud();
  const load = () => api<{ team: Member[] }>("/api/admin/equipe").then((r) => setTeam(r.team)).catch((e) => setError((e as Error).message));
  useEffect(() => {
    void load();
  }, []);
  return (
    <>
      <NavHeader
        title="Équipe"
        large={false}
        back={{ href: "/admin/plus", label: "Plus" }}
        actions={
          <button type="button" className="nav-icon" aria-label="Ajouter un collaborateur" onClick={() => setAdding(true)}>
            <UserPlus size={22} />
          </button>
        }
      />
      <div className="content">
        <Section title="Comptes" footer="Un collaborateur accède aux commandes, devis, produits et publications. Réglages, équipe, fidélité et sauvegarde restent réservés au propriétaire.">
          {team?.map((m) => (
            <div className="row" key={m.id}>
              <span className="row-icon tone-gray">
                <Users size={17} />
              </span>
              <span className="row-text">
                <span className="row-label">{m.name || m.email}</span>
                <span className="row-detail">
                  {m.email} · {m.role === "owner" ? "Propriétaire" : "Collaborateur"}
                </span>
              </span>
              {m.role !== "owner" && m.id !== selfId && (
                <button
                  type="button"
                  className="icon-plain destructive-text"
                  aria-label={`Retirer ${m.email}`}
                  onClick={async () => {
                    if (!confirm(`Retirer l’accès de ${m.email} ?`)) return;
                    try {
                      await api(`/api/admin/equipe/${m.id}`, "DELETE");
                      show("Accès retiré");
                      void load();
                    } catch (e) {
                      setError((e as Error).message);
                    }
                  }}
                >
                  <Trash2 size={18} />
                </button>
              )}
            </div>
          ))}
          {!team && !error && <div className="row"><span className="row-detail">Chargement…</span></div>}
        </Section>
        {error && <p className="inline-error" role="alert">{error}</p>}
      </div>
      <Sheet open={adding} onClose={() => setAdding(false)} title="Nouveau collaborateur">
        <form
          className="sheet-form"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              await api("/api/admin/equipe", "POST", form);
              setAdding(false);
              setForm({ name: "", email: "", password: "" });
              show("Collaborateur ajouté");
              void load();
            } catch (err) {
              setError((err as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label className="field">
            <span>Prénom</span>
            <input required minLength={2} maxLength={60} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>
          <label className="field">
            <span>E-mail</span>
            <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </label>
          <label className="field">
            <span>Mot de passe provisoire (12 caractères minimum)</span>
            <input required minLength={12} type="password" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <small>Transmettez-le en main propre ; le collaborateur le change dans Plus → Sécurité.</small>
          </label>
          {error && <p className="inline-error" role="alert">{error}</p>}
          <button className="btn filled large" disabled={busy}>
            Ajouter
          </button>
        </form>
      </Sheet>
      {hud}
    </>
  );
}

type Entry = { at: number; actor: string; action: string; entity: string; entity_id: string; details: string };
const actions: Record<string, string> = {
  "commande.statut": "Statut de commande",
  "commande.preparation": "Préparation",
  "commande.note": "Note interne",
  "commande.saisie": "Commande saisie",
  "devis.creation": "Devis créé",
  "devis.modification": "Devis modifié",
  "devis.statut": "Étape du devis",
  "devis.conversion": "Devis converti",
  "devis.note": "Note sur devis",
  "client.modification": "Fiche client",
  "client.note": "Note client",
  "client.coordonnees": "Coordonnées (espace pro)",
  "fidelite.gain": "Points gagnés",
  "fidelite.ajustement": "Ajustement fidélité",
  "fidelite.utilisation": "Récompense utilisée",
  "fidelite.regles": "Règles de fidélité",
  "equipe.ajout": "Collaborateur ajouté",
  "equipe.retrait": "Collaborateur retiré",
  "reglages.modification": "Réglages",
  "photo.import": "Photo importée",
};

/** Journal d'audit (propriétaire). */
export function JournalScreen() {
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    api<{ entries: Entry[] }>("/api/admin/journal").then((r) => setEntries(r.entries)).catch((e) => setError((e as Error).message));
  }, []);
  return (
    <>
      <NavHeader title="Journal" large={false} back={{ href: "/admin/plus", label: "Plus" }} />
      <div className="content">
        {error && <p className="inline-error" role="alert">{error}</p>}
        {entries && !entries.length && <Empty title="Aucune action enregistrée" />}
        {entries && entries.length > 0 && (
          <div className="group-body">
            {entries.map((e, n) => (
              <div className="row" key={n}>
                <span className="row-text">
                  <span className="row-label">
                    {actions[e.action] || e.action} · {e.entity_id}
                  </span>
                  <span className="row-detail">
                    {e.actor} · {when(e.at)}
                    {e.details && e.details !== "{}" ? ` · ${e.details.slice(0, 120)}` : ""}
                  </span>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
