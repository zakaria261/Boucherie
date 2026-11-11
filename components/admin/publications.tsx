"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  BadgePercent,
  CalendarClock,
  ChefHat,
  ChevronRight,
  Clock3,
  Megaphone,
  Newspaper,
  PartyPopper,
  Plus,
  Search,
  Sparkles,
  Store,
  Truck,
} from "lucide-react";
import { unitShort, type Post, type Product, type Promotion, type Recipe } from "@/lib/types";
import { formatStock, isWeighed, money } from "@/lib/shop";
import { api } from "./api";
import { PUSH, Empty, NavHeader, Segmented, Sheet, Stepper, Toggle, useHud, useScreenState } from "./ui";
import { Photo } from "@/components/site/photo";

export type PromoRow = Promotion & { state: string; productName: string; unit: Product["unit"] };
type Tab = "promotions" | "actualites" | "recettes";

const postState = (p: Post) => {
  const now = new Date().toISOString();
  if (p.draft) return { label: "Brouillon", tone: "gray" };
  if (p.publishAt > now) return { label: "Programmée", tone: "blue" };
  if (p.endsAt && p.endsAt <= now) return { label: "Terminée", tone: "gray" };
  return { label: "En ligne", tone: "green" };
};
const promoTone: Record<string, string> = {
  "En cours": "green",
  Programmée: "blue",
  Terminée: "gray",
  Épuisée: "orange",
  Désactivée: "gray",
};
const shortDate = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

export function PublicationsScreen({
  promotions,
  posts,
  recipes,
  products,
}: {
  promotions: PromoRow[];
  posts: Post[];
  recipes: Recipe[];
  products: Product[];
}) {
  const router = useRouter();
  const [tab, setTab] = useScreenState<Tab>("publications-tab", "promotions");
  const [choosing, setChoosing] = useState(false);
  const [flash, setFlash] = useState(false);
  const [promo, setPromo] = useState<PromoRow | null>(null);
  const { hud, show } = useHud();
  const featured = products.filter((p) => p.featured && p.published).length;
  const today = products.filter((p) => p.readyToday && p.published).length;

  return (
    <>
      <NavHeader title="Publications" />
      <div className="content">
        <button type="button" className="btn filled large new-post" onClick={() => setChoosing(true)}>
          <Plus size={20} /> Nouvelle publication
        </button>
        <div className="group-body">
          <Link transitionTypes={PUSH} href="/admin/stock" className="row">
            <span className="row-icon tone-green">
              <Store size={17} />
            </span>
            <span className="row-text">
              <span className="row-label">Produits du jour</span>
              <span className="row-detail">Rubrique « Disponible aujourd’hui » de l’accueil</span>
            </span>
            <span className="row-value">{today}</span>
            <ChevronRight className="row-chevron" size={18} />
          </Link>
          <Link href="/admin/produits" className="row">
            <span className="row-icon tone-blue">
              <Sparkles size={17} />
            </span>
            <span className="row-text">
              <span className="row-label">Produits à la une</span>
              <span className="row-detail">Activez « À la une » sur un produit</span>
            </span>
            <span className="row-value">{featured}</span>
            <ChevronRight className="row-chevron" size={18} />
          </Link>
        </div>
        <Segmented
          label="Type de publication"
          value={tab}
          onChange={setTab}
          options={[
            { value: "promotions", label: "Promotions" },
            { value: "actualites", label: "Actualités" },
            { value: "recettes", label: "Recettes" },
          ]}
        />

        {tab === "promotions" &&
          (promotions.length ? (
            <div className="group-body">
              {promotions.map((p) => (
                <button type="button" key={p.id} className="row" onClick={() => setPromo(p)}>
                  <span className="row-text">
                    <span className="row-label">{p.productName}</span>
                    <span className="row-detail">
                      {money(p.price)} · jusqu’au {shortDate(p.endsAt)}
                    </span>
                  </span>
                  <span className={`pill ${promoTone[p.state]}`}>{p.state}</span>
                  <ChevronRight className="row-chevron" size={18} />
                </button>
              ))}
            </div>
          ) : (
            <Empty icon={<BadgePercent size={34} />} title="Aucune promotion">
              Créez une promotion flash en quelques secondes.
            </Empty>
          ))}

        {tab === "actualites" &&
          (posts.length ? (
            <div className="group-body">
              {posts.map((p) => {
                const s = postState(p);
                return (
                  <Link transitionTypes={PUSH} key={p.id} href={`/admin/publications/actualites/${p.id}`} className="row product-row">
                    {p.image ? <Photo src={p.image} sizes="64px" /> : <span className="row-icon tone-gray"><Newspaper size={17} /></span>}
                    <span className="row-text">
                      <span className="row-label">{p.title}</span>
                      <span className="row-detail">
                        {p.type} · {shortDate(p.publishAt)}
                        {p.featured ? " · sur l’accueil" : ""}
                      </span>
                    </span>
                    <span className={`pill ${s.tone}`}>{s.label}</span>
                    <ChevronRight className="row-chevron" size={18} />
                  </Link>
                );
              })}
            </div>
          ) : (
            <Empty icon={<Newspaper size={34} />} title="Aucune actualité">
              Annoncez un arrivage, un événement ou un changement d’horaires.
            </Empty>
          ))}

        {tab === "recettes" && (
          <>
            <div className="group-body">
              {recipes.map((r) => (
                <Link transitionTypes={PUSH} key={r.id} href={`/admin/publications/recettes/${r.id}`} className="row product-row">
                  {r.image ? <Photo src={r.image} sizes="64px" /> : <span className="row-icon tone-gray"><ChefHat size={17} /></span>}
                  <span className="row-text">
                    <span className="row-label">{r.title}</span>
                    <span className="row-detail">
                      {r.servings} pers. · {r.prepMinutes + r.cookMinutes} min
                    </span>
                  </span>
                  <span className={`pill ${r.published ? "green" : "gray"}`}>
                    {r.published ? "En ligne" : "Masquée"}
                  </span>
                  <ChevronRight className="row-chevron" size={18} />
                </Link>
              ))}
            </div>
            <Link transitionTypes={PUSH} href="/admin/publications/recettes/nouvelle" className="btn tinted large">
              <Plus size={18} /> Nouvelle recette
            </Link>
          </>
        )}
      </div>

      <Sheet open={choosing} onClose={() => setChoosing(false)} title="Nouvelle publication">
        <div className="type-grid">
          <button
            type="button"
            className="type-card accent"
            onClick={() => {
              setChoosing(false);
              setFlash(true);
            }}
          >
            <BadgePercent size={26} />
            <strong>Promotion flash</strong>
            <small>Un prix réduit, tout de suite</small>
          </button>
          {[
            ["Actualité", Megaphone, "Une nouvelle, une annonce"],
            ["Arrivage", Truck, "Un produit qui vient d’arriver"],
            ["Événement", PartyPopper, "Dégustation, fête, animation"],
            ["Horaires", Clock3, "Fermeture, horaires spéciaux"],
            ["Campagne", CalendarClock, "Fêtes, barbecue, saison"],
          ].map(([type, Icon, hint]) => {
            const I = Icon as typeof Megaphone;
            return (
              <Link transitionTypes={PUSH}
                key={type as string}
                className="type-card"
                href={`/admin/publications/actualites/nouvelle?type=${encodeURIComponent(type as string)}`}
              >
                <I size={24} />
                <strong>{type as string}</strong>
                <small>{hint as string}</small>
              </Link>
            );
          })}
          <Link transitionTypes={PUSH} className="type-card" href="/admin/publications/recettes/nouvelle">
            <ChefHat size={24} />
            <strong>Recette</strong>
            <small>Avec les morceaux à commander</small>
          </Link>
          <Link transitionTypes={PUSH} className="type-card" href="/admin/stock">
            <Store size={24} />
            <strong>Produits du jour</strong>
            <small>Ce qui est prêt aujourd’hui</small>
          </Link>
        </div>
      </Sheet>

      {flash && (
        <FlashPromo
          products={products}
          onClose={() => setFlash(false)}
          onSaved={() => {
            setFlash(false);
            setTab("promotions");
            show("Promotion publiée");
            router.refresh();
          }}
        />
      )}
      {promo && (
        <PromoSheet
          promo={promo}
          onClose={() => setPromo(null)}
          onChanged={(message) => {
            setPromo(null);
            show(message);
            router.refresh();
          }}
        />
      )}
      {hud}
    </>
  );
}

const pad = (n: number) => String(n).padStart(2, "0");
const toLocalInput = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
function endOf(kind: string) {
  const d = new Date();
  if (kind === "weekend") d.setDate(d.getDate() + ((7 - d.getDay()) % 7));
  if (kind === "7j") d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 0, 0);
  return d;
}

/** Création d'une promotion flash en quelques gestes. */
export function FlashPromo({
  products,
  onClose,
  onSaved,
  initialProduct,
}: {
  products: Product[];
  onClose: () => void;
  onSaved: () => void;
  initialProduct?: Product;
}) {
  const [product, setProduct] = useState<Product | null>(initialProduct || null);
  const [query, setQuery] = useState("");
  const [price, setPrice] = useState("");
  const [limit, setLimit] = useState(false);
  const [quantity, setQuantity] = useState(10000);
  const [duration, setDuration] = useState("today");
  const [scheduled, setScheduled] = useState(false);
  const [start, setStart] = useState(toLocalInput(new Date()));
  const [end, setEnd] = useState(toLocalInput(endOf("7j")));
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const cents = Math.round(Number(price.replace(",", ".")) * 100);
  const valid = product && Number.isFinite(cents) && cents > 0 && cents < product.price;
  const discount = product && valid ? Math.round((1 - cents / product.price) * 100) : 0;
  const matches = products
    .filter((p) => p.published && p.name.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 8);
  const step = product && isWeighed(product.unit) ? (product.unit === "kg" ? 1000 : 100) : 1;

  async function publish() {
    if (!product || !valid) return setError("Indiquez un prix inférieur au prix habituel.");
    const startsAt = scheduled ? new Date(start) : new Date();
    const endsAt = duration === "custom" ? new Date(end) : endOf(duration);
    if (endsAt <= startsAt) return setError("La fin doit être après le début.");
    setBusy(true);
    setError("");
    try {
      await api("/api/admin/promotions", "POST", {
        productId: product.id,
        price: cents,
        label,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        maxQuantity: limit ? quantity : null,
        active: true,
      });
      onSaved();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <Sheet open onClose={onClose} title="Nouvelle promotion" dirty={!!product || !!price}>
      {!product ? (
        <>
          <div className="search-bar">
            <Search size={17} aria-hidden="true" />
            <input
              type="search"
              autoFocus
              placeholder="Quel produit ?"
              aria-label="Choisir le produit"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="group-body">
            {matches.map((p) => (
              <button type="button" key={p.id} className="row product-row" onClick={() => setProduct(p)}>
                <Photo src={p.image} sizes="64px" />
                <span className="row-text">
                  <span className="row-label">{p.name}</span>
                  <span className="row-detail">
                    {money(p.price)} {unitShort[p.unit]}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="group-body">
            <button type="button" className="row product-row" onClick={() => setProduct(null)}>
              <Photo src={product.image} sizes="160px" />
              <span className="row-text">
                <span className="row-label">{product.name}</span>
                <span className="row-detail">
                  Prix normal : {money(product.price)} {unitShort[product.unit]}
                </span>
              </span>
              <span className="row-value link">Changer</span>
            </button>
            <label className="row field-row">
              <span className="row-label">Nouveau prix</span>
              <span className="price-input">
                <input
                  inputMode="decimal"
                  autoFocus
                  aria-label="Nouveau prix en euros"
                  placeholder={(product.price / 100).toFixed(2).replace(".", ",")}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
                €
              </span>
            </label>
            <div className="row chips-row">
              {[10, 15, 20, 30].map((pct) => (
                <button
                  type="button"
                  key={pct}
                  className="chip"
                  onClick={() =>
                    setPrice(((Math.round(product.price * (1 - pct / 100)) / 100).toFixed(2)).replace(".", ","))
                  }
                >
                  −{pct} %
                </button>
              ))}
            </div>
          </div>
          <div className="group-body">
            <Toggle label="Limiter la quantité" checked={limit} onChange={setLimit} />
            {limit && (
              <div className="row stepper-row">
                <Stepper
                  label="quantité en promotion"
                  value={quantity}
                  step={step}
                  min={step}
                  onChange={setQuantity}
                  format={(v) => formatStock(product.unit, v)}
                />
              </div>
            )}
          </div>
          <div className="group-body">
            <div className="row chips-row" role="group" aria-label="Durée">
              {[
                ["today", "Aujourd’hui"],
                ["weekend", "Jusqu’à dimanche"],
                ["7j", "7 jours"],
                ["custom", "Autre"],
              ].map(([value, text]) => (
                <button
                  type="button"
                  key={value}
                  className="chip"
                  aria-pressed={duration === value}
                  onClick={() => setDuration(value)}
                >
                  {text}
                </button>
              ))}
            </div>
            {duration === "custom" && (
              <label className="row field-row">
                <span className="row-label">Fin</span>
                <input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} />
              </label>
            )}
            <Toggle label="Programmer le début" checked={scheduled} onChange={setScheduled} />
            {scheduled && (
              <label className="row field-row">
                <span className="row-label">Début</span>
                <input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
              </label>
            )}
            <label className="row field-row">
              <span className="row-label">Titre</span>
              <input
                placeholder="Facultatif, ex. Spécial week-end"
                maxLength={80}
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
            </label>
          </div>
          <p className="group-title">Aperçu sur le site</p>
          <div className="promo-preview" aria-label="Aperçu de la carte">
            <div className="promo-preview-img">
              <Photo src={product.image} sizes="160px" />
              {discount > 0 && <span>−{discount} %</span>}
            </div>
            <div>
              {label && <small>{label}</small>}
              <strong>{product.name}</strong>
              <span>
                {valid && <s>{money(product.price)}</s>} <b>{money(valid ? cents : product.price)}</b>{" "}
                {unitShort[product.unit]}
              </span>
              {limit && <small>Reste {formatStock(product.unit, quantity)}</small>}
            </div>
          </div>
          {error && <p className="inline-error" role="alert">{error}</p>}
          <div className="sheet-buttons">
            <button type="button" className="btn filled large" disabled={busy || !valid} onClick={() => void publish()}>
              {busy ? "Publication…" : scheduled ? "Programmer la promotion" : "Publier maintenant"}
            </button>
          </div>
        </>
      )}
    </Sheet>
  );
}

function PromoSheet({
  promo,
  onClose,
  onChanged,
}: {
  promo: PromoRow;
  onClose: () => void;
  onChanged: (message: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  async function run(method: string, body: Record<string, unknown>, message: string) {
    setBusy(true);
    setError("");
    try {
      await api(`/api/admin/promotions/${promo.id}`, method, { ...body, version: promo.version });
      onChanged(message);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <Sheet open onClose={onClose} title={promo.productName}>
      <div className="group-body">
        <div className="row">
          <span className="row-label">État</span>
          <span className={`pill ${promoTone[promo.state]}`}>{promo.state}</span>
        </div>
        <div className="row">
          <span className="row-label">Prix promotionnel</span>
          <span className="row-value">{money(promo.price)}</span>
        </div>
        <div className="row">
          <span className="row-label">Du</span>
          <span className="row-value">{shortDate(promo.startsAt)}</span>
        </div>
        <div className="row">
          <span className="row-label">Au</span>
          <span className="row-value">{shortDate(promo.endsAt)}</span>
        </div>
        {promo.maxQuantity !== null && (
          <div className="row">
            <span className="row-label">Réservé</span>
            <span className="row-value">
              {formatStock(promo.unit, promo.sold)} sur {formatStock(promo.unit, promo.maxQuantity)}
            </span>
          </div>
        )}
      </div>
      {error && <p className="inline-error" role="alert">{error}</p>}
      <div className="sheet-buttons">
        {promo.active ? (
          <button type="button" className="btn destructive large" disabled={busy} onClick={() => void run("PATCH", { active: false }, "Promotion arrêtée")}>
            Arrêter maintenant
          </button>
        ) : (
          <button type="button" className="btn filled large" disabled={busy} onClick={() => void run("PATCH", { active: true }, "Promotion réactivée")}>
            Réactiver
          </button>
        )}
        {confirmDelete ? (
          <button type="button" className="btn plain destructive-text" disabled={busy} onClick={() => void run("DELETE", {}, "Promotion supprimée")}>
            Confirmer la suppression
          </button>
        ) : (
          <button type="button" className="btn plain destructive-text" onClick={() => setConfirmDelete(true)}>
            Supprimer de l’historique
          </button>
        )}
      </div>
    </Sheet>
  );
}
