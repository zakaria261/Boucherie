"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BookOpen, ChevronRight, ExternalLink } from "lucide-react";
import type { Product } from "@/lib/types";
import type { GuideAnimal, GuideCut } from "@/lib/server/cut-guide";
import { money } from "@/lib/shop";
import { Photo } from "@/components/site/photo";
import { api, openSite } from "./api";
import { ImageField } from "./image-field";
import { NavHeader, PUSH, Section, Segmented, Toggle, useHud, useScreenState } from "./ui";

/** Liste des morceaux par espèce, avec l'état de chaque fiche. */
export function CutGuideAdmin({ guide }: { guide: GuideAnimal[] }) {
  const [animal, setAnimal] = useScreenState<string>("guide-animal", "boeuf");
  const current = guide.find((a) => a.id === animal) || guide[0];
  return (
    <>
      <NavHeader title="Guide des morceaux" back={{ href: "/admin/publications", label: "Publications" }} />
      <div className="content">
        <Segmented
          label="Espèce"
          value={current.id}
          onChange={setAnimal}
          options={guide.map((a) => ({ value: a.id, label: a.name }))}
        />
        <div className="group-body">
          {current.cuts.map((c) => (
            <Link
              transitionTypes={PUSH}
              key={c.key}
              href={`/admin/publications/morceaux/${encodeURIComponent(c.key)}`}
              className="row product-row"
            >
              {c.image ? (
                <Photo src={c.image} sizes="64px" />
              ) : (
                <span className="row-icon tone-red">
                  <BookOpen size={17} />
                </span>
              )}
              <span className="row-text">
                <span className="row-label">{c.name}</span>
                <span className="row-detail">
                  {c.productIds.length
                    ? `${c.productIds.length} produit${c.productIds.length > 1 ? "s" : ""} lié${c.productIds.length > 1 ? "s" : ""}`
                    : "Aucun produit lié"}
                </span>
              </span>
              {c.edited && <span className="pill blue">Modifié</span>}
              <ChevronRight className="row-chevron" size={18} />
            </Link>
          ))}
        </div>
        <a className="callout subtle" href={`/morceaux?espece=${current.id}`} target="_blank" rel="noreferrer" onClick={(e) => openSite(e, `/morceaux?espece=${current.id}`)}>
          <ExternalLink size={18} />
          <span>
            <strong>Voir le guide sur le site</strong>
          </span>
        </a>
      </div>
    </>
  );
}

/** Fiche d'un morceau : textes, photo et produits liés (même espèce). */
export function CutEditor({ animal, cut, products }: { animal: string; cut: GuideCut; products: Product[] }) {
  const router = useRouter();
  const initial = {
    name: cut.name,
    summary: cut.summary,
    texture: cut.texture,
    flavor: cut.flavor,
    bone: cut.bone,
    cooking: cut.cooking.join("\n"),
    tip: cut.tip,
    dish: cut.dish,
    image: cut.image,
    productIds: cut.productIds.filter((id) => products.some((p) => p.id === id)),
  };
  const [draft, setDraft] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const { hud, show } = useHud();
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);
  const set = (patch: Partial<typeof draft>) => setDraft((d) => ({ ...d, ...patch }));
  const url = `/api/admin/morceaux/${encodeURIComponent(cut.key)}`;

  async function save() {
    setBusy(true);
    setError("");
    try {
      await api(url, "PUT", { ...draft, cooking: draft.cooking.split("\n").map((l) => l.trim()).filter(Boolean) });
      show("Enregistré");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const area = (key: keyof typeof draft, label: string, rows: number, max: number, hint?: string) => (
    <label className="field">
      <span>{label}</span>
      <textarea rows={rows} maxLength={max} value={draft[key] as string} onChange={(e) => set({ [key]: e.target.value })} />
      {hint && <small>{hint}</small>}
    </label>
  );

  return (
    <>
      <NavHeader title={cut.name} large={false} back={{ href: "/admin/publications/morceaux", label: "Morceaux" }} />
      <div className="content">
        <p className="list-footer">
          {animal} · fiche {cut.edited ? "modifiée par vos soins" : "d’origine"}
        </p>
        <Section title="Présentation">
          <label className="field">
            <span>Nom du morceau</span>
            <input maxLength={60} value={draft.name} onChange={(e) => set({ name: e.target.value })} />
          </label>
          {area("summary", "Présentation (2 ou 3 phrases)", 3, 600)}
          {area("texture", "Texture", 2, 200)}
          {area("flavor", "Saveur", 2, 200)}
          {area("bone", "Os", 2, 200)}
        </Section>
        <Section title="Conseils">
          {area("cooking", "Cuissons conseillées (une par ligne)", 5, 2400, "Précisez l’épaisseur ou le poids pour chaque durée.")}
          {area("tip", "Conseil du boucher", 3, 500)}
          {area("dish", "Idée de plat", 2, 200)}
        </Section>
        <Section title="Photo" footer="Uniquement une photo de ce morceau précis ; sans photo, la fiche reste élégante.">
          <div className="pad">
            <ImageField label={`Photo du morceau ${cut.name}`} value={draft.image} onChange={(v) => set({ image: v })} onBusy={setUploading} />
          </div>
          {draft.image && (
            <button type="button" className="row add-row destructive-text" onClick={() => set({ image: "" })}>
              Retirer la photo
            </button>
          )}
        </Section>
        <Section title="Produits de la vitrine" footer={`Produits ${animal.toLowerCase()} affichés sous la fiche. Seuls les produits publiés apparaissent sur le site.`}>
          {products.map((p) => (
            <Toggle
              key={p.id}
              label={p.name}
              detail={`${money(p.price)}${p.published ? "" : " · masqué sur le site"}${p.available ? "" : " · indisponible"}`}
              checked={draft.productIds.includes(p.id)}
              onChange={(on) =>
                set({ productIds: on ? [...draft.productIds, p.id] : draft.productIds.filter((id) => id !== p.id) })
              }
            />
          ))}
        </Section>
        {cut.edited && (
          <button
            type="button"
            className="btn plain destructive-text"
            disabled={busy}
            onClick={async () => {
              if (!confirm("Rétablir la fiche d’origine ? Vos modifications seront perdues.")) return;
              setBusy(true);
              try {
                await api(url, "DELETE");
                router.refresh();
                router.replace("/admin/publications/morceaux");
              } catch (e) {
                setError((e as Error).message);
                setBusy(false);
              }
            }}
          >
            Rétablir la fiche d’origine
          </button>
        )}
        {error && <p className="inline-error" role="alert">{error}</p>}
      </div>
      {dirty && (
        <div className="action-bar">
          <button type="button" className="btn filled large" disabled={busy || uploading} onClick={() => void save()}>
            {busy ? "Enregistrement…" : "Enregistrer la fiche"}
          </button>
        </div>
      )}
      {hud}
    </>
  );
}
