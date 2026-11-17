"use client";
import { useState } from "react";
import { ExternalLink, Plus, Trash2 } from "lucide-react";
import type { FestiveCatalog, FestiveItem } from "@/lib/fetes";
import { api } from "./api";
import { NavHeader, Section, Toggle, useHud } from "./ui";

/** Catalogue des fêtes : visibilité, rubriques et fiches produits (sans prix). */
export function FestiveEditor({ initial }: { initial: FestiveCatalog }) {
  const [catalog, setCatalog] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [current, setCurrent] = useState(initial.sections[0]?.id || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { hud, show } = useHud();
  const dirty = JSON.stringify(catalog) !== JSON.stringify(saved);
  const s = catalog.sections.findIndex((x) => x.id === current);
  const section = catalog.sections[s];

  const setSection = (patch: Partial<typeof section>) =>
    setCatalog({ ...catalog, sections: catalog.sections.map((x, n) => (n === s ? { ...x, ...patch } : x)) });
  const setItem = (k: number, patch: Partial<FestiveItem>) =>
    setSection({ items: section.items.map((it, n) => (n === k ? { ...it, ...patch } : it)) });

  async function save() {
    setBusy(true);
    setError("");
    try {
      const clean = {
        ...catalog,
        sections: catalog.sections.map((x) => ({
          ...x,
          items: x.items.map((it) => ({ ...it, details: it.details.map((d) => d.trim()).filter(Boolean) })),
        })),
      };
      const result = await api<{ catalog: FestiveCatalog }>("/api/admin/fetes", "PUT", clean);
      setCatalog(result.catalog);
      setSaved(result.catalog);
      show("Enregistré");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <NavHeader title="Catalogue des fêtes" large={false} back={{ href: "/admin/publications", label: "Publications" }} />
      <div className="content">
        <Section footer="Hors saison, désactivez le catalogue : la page indique alors qu’il revient bientôt. Aucun prix n’est affiché, chaque produit se demande via la liste de courses.">
          <Toggle label="Catalogue visible sur le site" checked={catalog.visible} onChange={(v) => setCatalog({ ...catalog, visible: v })} />
          <label className="field">
            <span>Message d’introduction</span>
            <textarea rows={4} maxLength={800} value={catalog.intro} onChange={(e) => setCatalog({ ...catalog, intro: e.target.value })} />
          </label>
        </Section>

        <label className="field">
          <span>Rubrique</span>
          <select value={current} onChange={(e) => setCurrent(e.target.value)}>
            {catalog.sections.map((x) => (
              <option key={x.id} value={x.id}>
                {x.title} ({x.items.length})
              </option>
            ))}
          </select>
        </label>

        {section && (
          <>
            <Section title="Rubrique">
              <label className="field">
                <span>Titre</span>
                <input maxLength={80} value={section.title} onChange={(e) => setSection({ title: e.target.value })} />
              </label>
              <label className="field">
                <span>Présentation (facultatif)</span>
                <textarea rows={3} maxLength={600} value={section.intro} onChange={(e) => setSection({ intro: e.target.value })} />
              </label>
            </Section>
            {section.items.map((it, k) => (
              <Section key={it.id} title={it.name || "Nouveau produit"}>
                <label className="field">
                  <span>Nom</span>
                  <input maxLength={80} value={it.name} onChange={(e) => setItem(k, { name: e.target.value })} />
                </label>
                <label className="field">
                  <span>Description</span>
                  <textarea rows={3} maxLength={800} value={it.description} placeholder="Sans description, seul le nom est affiché." onChange={(e) => setItem(k, { description: e.target.value })} />
                </label>
                <label className="field">
                  <span>Précisions (une par ligne : marque, unité, origine, personnes…)</span>
                  <textarea rows={Math.max(2, it.details.length)} value={it.details.join("\n")} onChange={(e) => setItem(k, { details: e.target.value.split("\n") })} />
                </label>
                <label className="field">
                  <span>Temps de cuisson (facultatif)</span>
                  <input maxLength={200} value={it.cooking} onChange={(e) => setItem(k, { cooking: e.target.value })} />
                </label>
                <Toggle label="Visible sur le site" checked={it.visible} onChange={(v) => setItem(k, { visible: v })} />
                <button type="button" className="row add-row destructive-text" onClick={() => setSection({ items: section.items.filter((_, n) => n !== k) })}>
                  <Trash2 size={17} /> Supprimer ce produit
                </button>
              </Section>
            ))}
            <button
              type="button"
              className="btn tinted large"
              onClick={() =>
                setSection({
                  items: [
                    ...section.items,
                    { id: `produit-${Date.now().toString(36)}`, name: "", description: "", details: [], cooking: "", visible: false },
                  ],
                })
              }
            >
              <Plus size={18} /> Ajouter un produit
            </button>
          </>
        )}
        <a className="callout subtle" href="/catalogue-des-fetes" target="_blank" rel="noreferrer">
          <ExternalLink size={18} />
          <span>
            <strong>Voir le catalogue sur le site</strong>
          </span>
        </a>
        {error && <p className="inline-error" role="alert">{error}</p>}
      </div>
      {dirty && (
        <div className="action-bar">
          <button type="button" className="btn filled large" disabled={busy} onClick={() => void save()}>
            {busy ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      )}
      {hud}
    </>
  );
}
