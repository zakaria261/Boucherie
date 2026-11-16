"use client";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { Camera, ImagePlus, Minus, Plus, ScanText, Search, Trash2 } from "lucide-react";
import type { FreeUnit, Order, Product } from "@/lib/types";
import { freeUnits } from "@/lib/types";
import { linePrice, money, parisNow, portionLabel, weightsFor } from "@/lib/shop";
import { api, haptic } from "./api";
import { NavHeader, Section, Segmented, Sheet } from "./ui";
import { useOrders } from "./shell";
import { shrink } from "./image-field";

type Origin = "telephone" | "whatsapp" | "manuel" | "photo";
type CatalogLine = { id: string; grams: number; quantity: number };
type FreeLine = { name: string; quantity: string; unit: FreeUnit; note: string };
const KEY = "fp:commande-cle";

function attemptKey() {
  try {
    const saved = sessionStorage.getItem(KEY);
    if (saved) return saved;
    const key = crypto.randomUUID();
    sessionStorage.setItem(KEY, key);
    return key;
  } catch {
    return crypto.randomUUID();
  }
}

/**
 * Saisie d'une commande reçue hors du site (téléphone, WhatsApp, comptoir,
 * photo d'un bon). Rien n'est créé sans validation : la photo sert de
 * support, l'équipe recopie et vérifie chaque information.
 */
export function ManualOrder({ products, startWithPhoto }: { products: Product[]; startWithPhoto: boolean }) {
  const router = useRouter();
  const { replace } = useOrders();
  const [origin, setOrigin] = useState<Origin>(startWithPhoto ? "photo" : "telephone");
  const [client, setClient] = useState({ name: "", phone: "", email: "" });
  const [date, setDate] = useState(parisNow().date);
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");
  const [catalog, setCatalog] = useState<CatalogLine[]>([]);
  const [free, setFree] = useState<FreeLine[]>([]);
  const [picker, setPicker] = useState(false);
  const [query, setQuery] = useState("");
  const [mediaId, setMediaId] = useState("");
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const camera = useRef<HTMLInputElement>(null);
  const gallery = useRef<HTMLInputElement>(null);

  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const matches = products.filter((p) => norm(p.name).includes(norm(query.trim()))).slice(0, 40);
  const estimate = catalog.reduce((sum, l) => {
    const p = byId.get(l.id);
    return p ? sum + linePrice(p.price, l.grams, l.quantity, p.unit) : sum;
  }, 0);

  async function upload(file: File | undefined) {
    if (!file) return;
    setError("");
    setNotice("");
    setBusy(true);
    try {
      const body = await shrink(file);
      const response = await fetch("/api/admin/media", { method: "POST", body });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "La photo n’a pas pu être importée.");
      setMediaId(result.id);
      setPreview(URL.createObjectURL(body));
      setOrigin("photo");
      if (result.duplicate) setNotice("Cette photo a déjà été importée : vérifiez qu’elle ne correspond pas à une commande existante.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError("");
    if (!catalog.length && !free.some((l) => l.name.trim())) return setError("Ajoutez au moins un article.");
    setBusy(true);
    try {
      const { order } = await api<{ order: Order }>("/api/admin/orders", "POST", {
        requestKey: attemptKey(),
        origin,
        ...client,
        date,
        time,
        notes,
        catalog: catalog.map((l) => ({ ...l, options: [] })),
        free: free.filter((l) => l.name.trim()),
        mediaId: mediaId || undefined,
      });
      try {
        sessionStorage.removeItem(KEY);
      } catch {}
      haptic("success");
      replace(order);
      router.replace(`/admin/commandes/${order.id}`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <>
      <NavHeader title="Nouvelle commande" large={false} back={{ href: "/admin/commandes", label: "Commandes" }} />
      <form className="content" onSubmit={submit}>
        <Segmented
          label="Origine"
          value={origin}
          onChange={setOrigin}
          options={[
            { value: "telephone", label: "Téléphone" },
            { value: "whatsapp", label: "WhatsApp" },
            { value: "manuel", label: "Comptoir" },
            { value: "photo", label: "Photo" },
          ]}
        />

        {(origin === "photo" || mediaId) && (
          <Section title="Ajouter depuis une photo" footer="Bon papier, capture d’écran d’un message… La photo reste privée, visible uniquement par l’équipe.">
            {preview ? (
              <a className="photo-source large" href={preview} target="_blank" rel="noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="Photo importée" />
              </a>
            ) : (
              <div className="photo-actions">
                <button type="button" className="btn tinted" disabled={busy} onClick={() => camera.current?.click()}>
                  <Camera size={18} /> Prendre une photo
                </button>
                <button type="button" className="btn tinted" disabled={busy} onClick={() => gallery.current?.click()}>
                  <ImagePlus size={18} /> Galerie ou capture
                </button>
              </div>
            )}
            <input ref={camera} type="file" accept="image/*" capture="environment" hidden onChange={(e) => void upload(e.target.files?.[0])} />
            <input ref={gallery} type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/heic" hidden onChange={(e) => void upload(e.target.files?.[0])} />
            <p className="field-note">
              <ScanText size={15} /> Lecture automatique du texte non disponible : recopiez les informations ci-dessous en vous aidant de la photo.
            </p>
            {notice && <p className="inline-warning" role="status">{notice}</p>}
          </Section>
        )}

        <Section title="Client">
          <label className="field">
            <span>Nom</span>
            <input required minLength={2} maxLength={100} autoComplete="off" value={client.name} onChange={(e) => setClient({ ...client, name: e.target.value })} />
          </label>
          <label className="field">
            <span>Téléphone</span>
            <input required type="tel" inputMode="tel" minLength={8} maxLength={25} value={client.phone} onChange={(e) => setClient({ ...client, phone: e.target.value })} />
          </label>
          <label className="field">
            <span>E-mail (facultatif)</span>
            <input type="email" maxLength={150} value={client.email} onChange={(e) => setClient({ ...client, email: e.target.value })} />
          </label>
        </Section>

        <Section title="Retrait">
          <label className="field">
            <span>Date</span>
            <input type="date" required min={parisNow().date} value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label className="field">
            <span>Heure (facultatif)</span>
            <input type="time" step={300} value={time} onChange={(e) => setTime(e.target.value)} />
          </label>
        </Section>

        <Section title="Articles du catalogue" footer={catalog.length ? `Estimation au prix actuel : ${money(estimate)}` : undefined}>
          {catalog.map((line, n) => {
            const p = byId.get(line.id)!;
            return (
              <div className="row manual-line" key={`${line.id}-${n}`}>
                <span className="row-text">
                  <span className="row-label">{p.name}</span>
                  <select
                    aria-label={`Portion de ${p.name}`}
                    value={line.grams}
                    onChange={(e) => setCatalog(catalog.map((l, i) => (i === n ? { ...l, grams: Number(e.target.value) } : l)))}
                  >
                    {weightsFor(p).map((g) => (
                      <option key={g} value={g}>
                        {portionLabel(p.unit, g)}
                      </option>
                    ))}
                  </select>
                </span>
                <span className="mini-stepper">
                  <button type="button" aria-label="Moins" onClick={() => setCatalog(catalog.map((l, i) => (i === n ? { ...l, quantity: Math.max(1, l.quantity - 1) } : l)))}>
                    <Minus size={16} />
                  </button>
                  <b>{line.quantity}</b>
                  <button type="button" aria-label="Plus" onClick={() => setCatalog(catalog.map((l, i) => (i === n ? { ...l, quantity: Math.min(20, l.quantity + 1) } : l)))}>
                    <Plus size={16} />
                  </button>
                </span>
                <button type="button" className="icon-plain" aria-label={`Retirer ${p.name}`} onClick={() => setCatalog(catalog.filter((_, i) => i !== n))}>
                  <Trash2 size={17} />
                </button>
              </div>
            );
          })}
          <button type="button" className="row add-row" onClick={() => setPicker(true)}>
            <Plus size={18} /> Ajouter un produit du catalogue
          </button>
        </Section>

        <Section title="Articles libres" footer="Sans prix : ils restent « à confirmer » jusqu’à ce que vous saisissiez le prix final dans la commande.">
          {free.map((line, n) => (
            <div className="free-line" key={n}>
              <input
                className="free-name"
                placeholder="Article"
                aria-label={`Article libre ${n + 1}`}
                maxLength={120}
                value={line.name}
                onChange={(e) => setFree(free.map((l, i) => (i === n ? { ...l, name: e.target.value } : l)))}
              />
              <div className="free-qty">
                <input
                  inputMode="decimal"
                  placeholder="Qté"
                  aria-label={`Quantité de l’article libre ${n + 1}`}
                  value={line.quantity}
                  onChange={(e) => setFree(free.map((l, i) => (i === n ? { ...l, quantity: e.target.value.replace(/[^\d.,]/g, "") } : l)))}
                />
                <select
                  aria-label={`Unité de l’article libre ${n + 1}`}
                  value={line.unit}
                  onChange={(e) => setFree(free.map((l, i) => (i === n ? { ...l, unit: e.target.value as FreeUnit } : l)))}
                >
                  {Object.entries(freeUnits).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
                <button type="button" className="icon-plain" aria-label={`Retirer l’article libre ${n + 1}`} onClick={() => setFree(free.filter((_, i) => i !== n))}>
                  <Trash2 size={17} />
                </button>
              </div>
              <input
                placeholder="Précisions (facultatif)"
                aria-label={`Précisions de l’article libre ${n + 1}`}
                maxLength={300}
                value={line.note}
                onChange={(e) => setFree(free.map((l, i) => (i === n ? { ...l, note: e.target.value } : l)))}
              />
            </div>
          ))}
          <button type="button" className="row add-row" onClick={() => setFree([...free, { name: "", quantity: "", unit: "kg", note: "" }])}>
            <Plus size={18} /> Ajouter un article libre
          </button>
        </Section>

        <Section title="Instructions">
          <label className="field">
            <span>Consignes (facultatif)</span>
            <textarea rows={3} maxLength={1500} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
        </Section>

        {error && <p className="inline-error" role="alert">{error}</p>}
        <p className="list-footer">La commande sera enregistrée « Acceptée » : vérifiez les informations avec le client.</p>
        <div className="action-bar">
          <button className="btn filled large" disabled={busy}>
            {busy ? "Enregistrement…" : "Enregistrer la commande"}
          </button>
        </div>
      </form>

      <Sheet open={picker} onClose={() => setPicker(false)} title="Produits">
        <div className="search-bar">
          <Search size={17} aria-hidden="true" />
          <input type="search" placeholder="Rechercher" aria-label="Rechercher un produit" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="group-body">
          {matches.map((p) => (
            <button
              key={p.id}
              type="button"
              className="row"
              onClick={() => {
                const weights = weightsFor(p);
                setCatalog([...catalog, { id: p.id, grams: weights.includes(500) ? 500 : weights[0], quantity: 1 }]);
                setPicker(false);
                setQuery("");
              }}
            >
              <span className="row-text">
                <span className="row-label">{p.name}</span>
                <span className="row-detail">
                  {money(p.price)} · {p.category}
                </span>
              </span>
              <Plus size={18} />
            </button>
          ))}
        </div>
      </Sheet>
    </>
  );
}
