"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search, Trash2, X } from "lucide-react";
import { postTypes, type Post, type PostType, type Product } from "@/lib/types";
import { api } from "./api";
import { ImageField } from "./image-field";
import { NavHeader, Section, Sheet, Toggle, useHud } from "./ui";

const pad = (n: number) => String(n).padStart(2, "0");
const toLocal = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export function PostEditor({
  initial,
  type,
  products,
}: {
  initial?: Post;
  type?: PostType;
  products: Product[];
}) {
  const router = useRouter();
  const [post, setPost] = useState({
    type: initial?.type || type || "Actualité",
    title: initial?.title || "",
    body: initial?.body || "",
    image: initial?.image || "",
    productIds: initial?.productIds || [],
    featured: initial?.featured ?? false,
    draft: initial?.draft ?? false,
  });
  const [schedule, setSchedule] = useState(
    !!initial && new Date(initial.publishAt) > new Date(),
  );
  const [publishAt, setPublishAt] = useState(toLocal(initial?.publishAt || new Date().toISOString()));
  const [hasEnd, setHasEnd] = useState(!!initial?.endsAt);
  const [endsAt, setEndsAt] = useState(
    toLocal(initial?.endsAt || new Date(Date.now() + 7 * 864e5).toISOString()),
  );
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [picker, setPicker] = useState(false);
  const [query, setQuery] = useState("");
  const [preview, setPreview] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { hud, show } = useHud();
  const set = (patch: Partial<typeof post>) => {
    setPost((p) => ({ ...p, ...patch }));
    setDirty(true);
  };

  async function save(draft: boolean) {
    setError("");
    if (!post.title.trim()) return setError("Donnez un titre à la publication.");
    setBusy(true);
    try {
      const body = {
        ...post,
        draft,
        // Programmée : date choisie. Sinon, une publication déjà en ligne
        // garde sa date d'origine ; une nouvelle part maintenant.
        publishAt: schedule
          ? new Date(publishAt).toISOString()
          : initial && !initial.draft && initial.publishAt <= new Date().toISOString()
            ? initial.publishAt
            : new Date().toISOString(),
        endsAt: hasEnd ? new Date(endsAt).toISOString() : "",
        version: initial?.version,
      };
      const result = await api<{ post: Post }>(
        initial ? `/api/admin/publications/${initial.id}` : "/api/admin/publications",
        initial ? "PUT" : "POST",
        body,
      );
      setDirty(false);
      show(draft ? "Brouillon enregistré" : schedule ? "Publication programmée" : "Publié");
      if (!initial) router.replace(`/admin/publications/actualites/${result.post.id}`);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!initial) return;
    setBusy(true);
    try {
      await api(`/api/admin/publications/${initial.id}`, "DELETE", { version: initial.version });
      router.push("/admin/publications");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  const linked = products.filter((p) => post.productIds.includes(p.id));

  return (
    <div className="editor">
      <NavHeader
        title={initial ? "Modifier" : `Nouvelle publication`}
        large={false}
        back={{ href: "/admin/publications", label: "Publications" }}
        actions={
          <button type="button" className="nav-text" onClick={() => setPreview(true)}>
            Aperçu
          </button>
        }
      />
      <div className="content">
        <Section title="Type">
          <div className="pad chip-wrap">
            {postTypes.map((t) => (
              <button type="button" key={t} className="chip" aria-pressed={post.type === t} onClick={() => set({ type: t })}>
                {t}
              </button>
            ))}
          </div>
        </Section>
        <Section title="Photo">
          <div className="pad">
            <ImageField label="Photo de la publication" value={post.image} onChange={(v) => set({ image: v })} onBusy={setUploading} />
            {post.image && (
              <button type="button" className="btn plain destructive-text" onClick={() => set({ image: "" })}>
                Retirer la photo
              </button>
            )}
          </div>
        </Section>
        <Section title="Texte">
          <label className="field">
            <span>Titre</span>
            <input
              maxLength={120}
              value={post.title}
              placeholder="Ex. Arrivage d’agneau de pré-salé"
              onChange={(e) => set({ title: e.target.value })}
            />
          </label>
          <label className="field">
            <span>Description</span>
            <textarea
              rows={6}
              maxLength={4000}
              value={post.body}
              placeholder="Quelques lignes, comme vous le diriez au comptoir."
              onChange={(e) => set({ body: e.target.value })}
            />
          </label>
        </Section>
        <Section title="Produits associés">
          {linked.map((p) => (
            <div className="row product-row" key={p.id}>
              <img src={p.image} alt="" />
              <span className="row-text">
                <span className="row-label">{p.name}</span>
              </span>
              <button
                type="button"
                className="nav-icon"
                aria-label={`Retirer ${p.name}`}
                onClick={() => set({ productIds: post.productIds.filter((id) => id !== p.id) })}
              >
                <X size={18} />
              </button>
            </div>
          ))}
          <button type="button" className="row" onClick={() => setPicker(true)}>
            <span className="row-label link">Ajouter un produit</span>
          </button>
        </Section>
        <Section title="Diffusion">
          <Toggle label="Mettre en avant sur l’accueil" checked={post.featured} onChange={(v) => set({ featured: v })} />
          <Toggle label="Programmer la publication" checked={schedule} onChange={(v) => { setSchedule(v); setDirty(true); }} />
          {schedule && (
            <label className="row field-row">
              <span className="row-label">Publier le</span>
              <input type="datetime-local" value={publishAt} onChange={(e) => { setPublishAt(e.target.value); setDirty(true); }} />
            </label>
          )}
          <Toggle label="Retirer automatiquement" checked={hasEnd} onChange={(v) => { setHasEnd(v); setDirty(true); }} />
          {hasEnd && (
            <label className="row field-row">
              <span className="row-label">Jusqu’au</span>
              <input type="datetime-local" value={endsAt} onChange={(e) => { setEndsAt(e.target.value); setDirty(true); }} />
            </label>
          )}
        </Section>
        {initial && (
          <button type="button" className="btn plain destructive-text" onClick={() => setDeleting(true)}>
            <Trash2 size={17} /> Supprimer la publication
          </button>
        )}
        {error && <p className="inline-error" role="alert">{error}</p>}
        {dirty && <p className="list-footer">Modifications non enregistrées</p>}
      </div>
      <div className="action-bar two">
        <button type="button" className="btn tinted large" disabled={busy || uploading} onClick={() => void save(true)}>
          Brouillon
        </button>
        <button type="button" className="btn filled large" disabled={busy || uploading} onClick={() => void save(false)}>
          {busy ? "…" : schedule ? "Programmer" : "Publier"}
        </button>
      </div>

      <Sheet open={picker} onClose={() => setPicker(false)} title="Produits associés">
        <div className="search-bar">
          <Search size={17} aria-hidden="true" />
          <input type="search" placeholder="Rechercher" aria-label="Rechercher un produit" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="group-body">
          {products
            .filter((p) => p.name.toLowerCase().includes(query.toLowerCase()))
            .slice(0, 40)
            .map((p) => {
              const on = post.productIds.includes(p.id);
              return (
                <button
                  type="button"
                  key={p.id}
                  className="row product-row"
                  aria-pressed={on}
                  onClick={() =>
                    set({
                      productIds: on
                        ? post.productIds.filter((id) => id !== p.id)
                        : [...post.productIds, p.id].slice(0, 12),
                    })
                  }
                >
                  <img src={p.image} alt="" />
                  <span className="row-text">
                    <span className="row-label">{p.name}</span>
                  </span>
                  {on && <span className="row-value link">✓</span>}
                </button>
              );
            })}
        </div>
      </Sheet>

      <Sheet open={preview} onClose={() => setPreview(false)} title="Aperçu">
        <article className="post-preview">
          {post.image && <img src={post.image} alt="" />}
          <span className="pill gray">{post.type}</span>
          <h3>{post.title || "Titre de la publication"}</h3>
          <p>{post.body || "Votre texte apparaîtra ici."}</p>
          {linked.length > 0 && <small>{linked.map((p) => p.name).join(" · ")}</small>}
        </article>
        <p className="sheet-text">
          {post.featured ? "Affichée dans « Les nouvelles de la boucherie » sur l’accueil et " : "Affichée "}
          dans la page Actualités du site.
        </p>
      </Sheet>

      <Sheet open={deleting} onClose={() => setDeleting(false)} title="Supprimer">
        <p className="sheet-text">Cette publication sera retirée du site et de l’historique.</p>
        <div className="sheet-buttons">
          <button type="button" className="btn destructive large" disabled={busy} onClick={() => void remove()}>
            Supprimer
          </button>
        </div>
      </Sheet>
      {hud}
    </div>
  );
}
