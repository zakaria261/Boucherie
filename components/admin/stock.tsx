"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Plus, Search } from "lucide-react";
import type { Product } from "@/lib/types";
import { formatStock, isWeighed } from "@/lib/shop";
import { api, haptic } from "./api";
import { Empty, NavHeader, Section, Sheet, Stepper } from "./ui";
import { Photo } from "@/components/site/photo";

/**
 * Quantités du jour. Chaque modification est enregistrée automatiquement
 * après une courte pause, pour pouvoir appuyer plusieurs fois sur + ou −.
 */
export function StockScreen({ initial }: { initial: Product[] }) {
  const router = useRouter();
  const [products, setProducts] = useState(initial);
  const [saving, setSaving] = useState<Record<string, "saving" | "saved" | string>>({});
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState("");
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const versions = useRef<Record<string, number>>(
    Object.fromEntries(initial.map((p) => [p.id, p.version])),
  );

  const tracked = products.filter((p) => p.stock !== null || p.readyToday);

  function change(id: string, patch: Partial<Product>) {
    setProducts((list) => list.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    clearTimeout(timers.current[id]);
    setSaving((s) => ({ ...s, [id]: "saving" }));
    timers.current[id] = setTimeout(async () => {
      const current = products.find((p) => p.id === id);
      try {
        const { product } = await api<{ product: Product }>(
          `/api/admin/produits/${encodeURIComponent(id)}`,
          "PATCH",
          { ...latest.current[id], version: versions.current[id] },
        );
        versions.current[id] = product.version;
        delete latest.current[id];
        setSaving((s) => ({ ...s, [id]: "saved" }));
        haptic("success");
        router.refresh();
      } catch (e) {
        setSaving((s) => ({ ...s, [id]: (e as Error).message }));
        if (current) setProducts((list) => list.map((p) => (p.id === id ? current : p)));
      }
    }, 700);
    latest.current[id] = { ...latest.current[id], ...patch };
  }
  const latest = useRef<Record<string, Partial<Product>>>({});

  const candidates = products
    .filter((p) => p.stock === null && !p.readyToday)
    .filter((p) => p.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <>
      <NavHeader
        title="Quantités du jour"
        back={{ href: "/admin/produits", label: "Produits" }}
        actions={
          <button type="button" className="nav-icon" aria-label="Suivre un produit" onClick={() => setAdding(true)}>
            <Plus size={26} />
          </button>
        }
      />
      <div className="content">
        <p className="intro-text">
          Les quantités saisies ici s’affichent sur le site (« Reste 3 kg ») et
          sont déduites à chaque commande. Un produit sans suivi reste
          simplement « disponible ».
        </p>
        {tracked.length ? (
          tracked.map((p) => {
            const state = saving[p.id];
            const step = isWeighed(p.unit) ? (p.unit === "kg" ? 500 : 100) : 1;
            return (
              <Section
                key={p.id}
                title={
                  <span className="stock-title">
                    {p.name}
                    <span className="save-state" aria-live="polite">
                      {state === "saving"
                        ? "Enregistrement…"
                        : state === "saved"
                          ? (
                              <>
                                <Check size={13} /> Enregistré
                              </>
                            )
                          : state || ""}
                    </span>
                  </span>
                }
              >
                <div className="row stepper-row">
                  {p.stock !== null ? (
                    <Stepper
                      label={`stock de ${p.name}`}
                      value={p.stock}
                      step={step}
                      onChange={(v) => change(p.id, { stock: v })}
                      format={(v) => formatStock(p.unit, v)}
                    />
                  ) : (
                    <button
                      type="button"
                      className="btn tinted small"
                      onClick={() => change(p.id, { stock: isWeighed(p.unit) ? 5000 : 10 })}
                    >
                      Saisir une quantité
                    </button>
                  )}
                  {p.stock !== null && (
                    <button
                      type="button"
                      className="btn plain destructive-text"
                      disabled={p.stock === 0}
                      onClick={() => change(p.id, { stock: 0 })}
                    >
                      Épuisé
                    </button>
                  )}
                </div>
                <label className="row toggle-row">
                  <span className="row-text">
                    <span className="row-label">Prêt aujourd’hui</span>
                  </span>
                  <input
                    type="checkbox"
                    role="switch"
                    className="switch"
                    checked={p.readyToday}
                    onChange={(e) => change(p.id, { readyToday: e.target.checked })}
                  />
                </label>
                {p.stock !== null && (
                  <button type="button" className="row" onClick={() => change(p.id, { stock: null })}>
                    <span className="row-text">
                      <span className="row-label subtle">Ne plus suivre le stock</span>
                    </span>
                  </button>
                )}
              </Section>
            );
          })
        ) : (
          <Empty title="Aucun produit suivi">
            Appuyez sur + pour indiquer les quantités disponibles aujourd’hui.
          </Empty>
        )}
      </div>
      <Sheet open={adding} onClose={() => setAdding(false)} title="Suivre un produit">
        <div className="search-bar">
          <Search size={17} aria-hidden="true" />
          <input
            type="search"
            placeholder="Rechercher"
            aria-label="Rechercher un produit à suivre"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="group-body">
          {candidates.slice(0, 40).map((p) => (
            <button
              type="button"
              key={p.id}
              className="row product-row"
              onClick={() => {
                change(p.id, { stock: isWeighed(p.unit) ? 5000 : 10 });
                setAdding(false);
                setQuery("");
              }}
            >
              <Photo src={p.image} sizes="64px" />
              <span className="row-text">
                <span className="row-label">{p.name}</span>
                <span className="row-detail">{p.category}</span>
              </span>
              <Plus size={20} className="row-chevron" />
            </button>
          ))}
        </div>
      </Sheet>
    </>
  );
}
