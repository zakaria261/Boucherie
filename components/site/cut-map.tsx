"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChefHat, Flame, Lightbulb, NotebookPen, Utensils } from "lucide-react";
import { animalMaps, layoutLabels, VIEW, viewBoxFor, type AnimalId } from "@/lib/cuts";
import type { GuideAnimal, GuideCut } from "@/lib/server/cut-guide";
import { ProductCard } from "./product-card";
import { Photo } from "./photo";
import { requestFromGuide } from "./shopping-list-form";
import { useShop } from "./store";

const tones = ["#8e2433", "#a52f3d", "#7a1f2b", "#b13a44", "#962a36", "#6f1b26", "#a8343c"];
const categoryOf: Record<AnimalId, string> = { boeuf: "Bœuf", agneau: "Agneau", veau: "Veau" };

/**
 * Guide interactif des morceaux. Survol : aperçu (tant qu'aucun morceau n'est
 * choisi) ; clic, toucher ou Entrée : sélection stable. La liste sous la carte
 * offre le même choix, plus confortable sur petit écran.
 */
export function CutExplorer({ guide }: { guide: GuideAnimal[] }) {
  const router = useRouter();
  const { products } = useShop();
  const [animalId, setAnimalId] = useState<AnimalId>("boeuf");
  const [selected, setSelected] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [focused, setFocused] = useState<string | null>(null);
  const [added, setAdded] = useState(false);
  const ready = useRef(false);

  // Lien partageable : ?espece=agneau&morceau=gigot. L'adresse d'origine est
  // lue une seule fois (même si l'effet est rejoué), puis appliquée.
  const initial = useRef<{ animal: AnimalId; cut: string | null } | null>(null);
  useEffect(() => {
    if (!initial.current) {
      const params = new URLSearchParams(window.location.search);
      const a = params.get("espece") as AnimalId | null;
      const animal = a && guide.some((g) => g.id === a) ? a : "boeuf";
      const m = params.get("morceau");
      const cut = m && guide.find((g) => g.id === animal)?.cuts.some((c) => c.id === m) ? m : null;
      initial.current = { animal, cut };
    }
    setAnimalId(initial.current.animal);
    setSelected(initial.current.cut);
    ready.current = true;
  }, [guide]);
  useEffect(() => {
    // L'adresse n'est mise à jour qu'après la lecture du lien d'origine.
    if (!ready.current) return;
    const query = `?espece=${animalId}${selected ? `&morceau=${selected}` : ""}`;
    if (window.location.search !== query) window.history.replaceState(null, "", `/morceaux${query}`);
  }, [animalId, selected]);

  const map = animalMaps.find((a) => a.id === animalId)!;
  const content = guide.find((g) => g.id === animalId)!;
  const byId = useMemo(() => new Map(content.cuts.map((c) => [c.id, c])), [content]);
  const labels = useMemo(
    () => layoutLabels(map, Object.fromEntries(content.cuts.map((c) => [c.id, c.label || c.name]))),
    [map, content],
  );
  // Téléphone : carte recadrée sur l'animal, légendes remplacées par la liste.
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(max-width: 759px)");
    const update = () => setCompact(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  const viewBox = compact ? `${VIEW.x} 80 ${VIEW.width} 506` : viewBoxFor(labels);
  // Un morceau qui n'existe pas pour l'espèce affichée est ignoré.
  const known = (id: string | null) => (id && byId.has(id) ? id : null);
  const current = known(selected);
  const active = known(hovered) || known(focused) || current;
  // Le survol ne remplace jamais une fiche choisie : il ne sert d'aperçu qu'avant le premier choix.
  const shownId = current || known(hovered) || known(focused);
  const shown = shownId ? byId.get(shownId) : undefined;
  const preview = !!shown && shown.id !== current;
  const clip = `corps-${animalId}`;

  const choose = (id: string) => {
    setSelected(id);
    setAdded(false);
  };
  const switchAnimal = (id: AnimalId) => {
    setAnimalId(id);
    setSelected(null);
    setHovered(null);
    setFocused(null);
    setAdded(false);
  };
  const hover = (id: string | null) => (e: React.PointerEvent) => {
    if (e.pointerType === "mouse") setHovered(id);
  };

  return (
    <div className="cut-guide">
      <div className="species-switch" role="tablist" aria-label="Animal">
        {guide.map((a) => (
          <button
            key={a.id}
            type="button"
            role="tab"
            aria-selected={a.id === animalId}
            aria-controls="carte-morceaux"
            onClick={() => switchAnimal(a.id)}
          >
            {a.name}
          </button>
        ))}
      </div>

      <section className="cut-board" id="carte-morceaux" aria-label={`Morceaux ${content.of}`}>
        <figure className="cut-figure">
          <svg viewBox={viewBox} role="group" aria-label={`Carte des morceaux ${content.of}`} onPointerLeave={() => setHovered(null)}>
            <defs>
              <clipPath id={clip}>
                <path d={map.body} />
              </clipPath>
            </defs>
            {map.farLegs.map((d) => (
              <path key={d} d={d} className="cut-far" />
            ))}
            <path d={map.body} className="cut-body" />
            {map.cuts.map((cut, i) => {
              const info = byId.get(cut.id)!;
              const state = cut.id === current ? "selected" : cut.id === active ? "active" : "";
              return (
                <g
                  key={cut.id}
                  className={`cut-zone ${state}`}
                  style={{ "--tone": tones[i % tones.length] } as React.CSSProperties}
                  clipPath={cut.free ? undefined : `url(#${clip})`}
                  role="button"
                  tabIndex={0}
                  aria-label={`${info.name}${cut.id === current ? ", sélectionné" : ""}`}
                  aria-pressed={cut.id === current}
                  onPointerEnter={hover(cut.id)}
                  onPointerLeave={hover(null)}
                  onFocus={() => setFocused(cut.id)}
                  onBlur={() => setFocused(null)}
                  onClick={() => choose(cut.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      choose(cut.id);
                    }
                  }}
                >
                  {cut.shapes.map((points) => (
                    <polygon key={points} points={points} />
                  ))}
                </g>
              );
            })}
            <path d={map.body} className="cut-outline" />
            {map.details.map((d) => (
              <path key={d} d={d} className="cut-detail" />
            ))}
            {map.fills?.map((d) => (
              <path key={d} d={d} className="cut-detail filled" />
            ))}
            <circle cx={map.eye[0]} cy={map.eye[1]} r={4.5} className="cut-eye" />
            {!compact && (
            <g className="cut-labels" aria-hidden="true">
              {labels.map((l) => (
                <g key={l.id} className={l.id === active ? "on" : ""}>
                  <polyline points={`${l.anchor[0]},${l.anchor[1]} ${l.x},${l.top ? l.y + 7 : l.y - 15}`} />
                  <circle cx={l.anchor[0]} cy={l.anchor[1]} r={2.6} />
                  <text x={l.x} y={l.y} textAnchor="middle">
                    {l.text}
                  </text>
                </g>
              ))}
            </g>
            )}
          </svg>
          <figcaption className="cut-caption" aria-live="polite">
            {active ? (
              <>
                <strong>{byId.get(active)!.name}</strong> · {content.name}
              </>
            ) : (
              "Sélectionnez un morceau pour découvrir nos conseils"
            )}
          </figcaption>
        </figure>

        <div className="cut-list" role="group" aria-label={`Liste des morceaux ${content.of}`}>
          {map.cuts.map((cut) => {
            const info = byId.get(cut.id)!;
            return (
              <button
                key={cut.id}
                type="button"
                aria-pressed={cut.id === current}
                className={cut.id === active ? "active" : ""}
                onPointerEnter={hover(cut.id)}
                onPointerLeave={hover(null)}
                onClick={() => choose(cut.id)}
              >
                {info.name}
              </button>
            );
          })}
        </div>
      </section>

      <div id="fiche-morceau" className="cut-sheet-area" aria-live="polite">
        {shown ? (
          <CutSheet
            cut={shown}
            animal={content}
            preview={preview}
            added={added}
            products={products.filter((p) => shown.productIds.includes(p.id) && p.category === categoryOf[animalId])}
            onRequest={() => {
              requestFromGuide(`${shown.name} (${content.name.toLowerCase()})`);
              setAdded(true);
              router.push("/liste-de-courses");
            }}
          />
        ) : (
          <p className="cut-empty">Sélectionnez un morceau pour découvrir nos conseils.</p>
        )}
      </div>
    </div>
  );
}

function CutSheet({
  cut,
  animal,
  preview,
  products,
  added,
  onRequest,
}: {
  cut: GuideCut;
  animal: GuideAnimal;
  preview: boolean;
  products: ReturnType<typeof useShop>["products"];
  added: boolean;
  onRequest: () => void;
}) {
  return (
    <article className={`cut-sheet ${preview ? "is-preview" : ""}`} aria-label={`${cut.name}, ${animal.name}`}>
      <header className="cut-sheet-head">
        <span className="eyebrow">
          {animal.name}
          {preview ? " · aperçu" : ""}
        </span>
        <h2>{cut.name}</h2>
        <p className="lead">{cut.summary}</p>
      </header>
      <div className={`cut-sheet-body ${cut.image ? "with-photo" : ""}`}>
        {cut.image && (
          <div className="cut-photo">
            <Photo src={cut.image} alt={`${cut.name} ${animal.of}`} sizes="(max-width: 760px) 100vw, 360px" />
          </div>
        )}
        <div className="cut-details">
          <dl className="cut-traits">
            <div>
              <dt>Texture</dt>
              <dd>{cut.texture}</dd>
            </div>
            <div>
              <dt>Saveur</dt>
              <dd>{cut.flavor}</dd>
            </div>
            <div>
              <dt>Os</dt>
              <dd>{cut.bone}</dd>
            </div>
          </dl>
          <h3>
            <Flame size={18} aria-hidden="true" /> Cuissons conseillées
          </h3>
          <ul className="cut-cooking">
            {cut.cooking.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
          <p className="fine">Durées indicatives, à adapter à votre appareil et à la cuisson souhaitée.</p>
          <div className="cut-tip">
            <ChefHat size={20} aria-hidden="true" />
            <p>
              <strong>Le conseil du boucher</strong>
              {cut.tip}
            </p>
          </div>
          <p className="cut-dish">
            <Utensils size={18} aria-hidden="true" />
            <span>
              <strong>Idée de plat :</strong> {cut.dish}
            </span>
          </p>
        </div>
      </div>

      {!preview && (
        <section className="cut-products" aria-labelledby="vitrine-titre">
          <h3 id="vitrine-titre">Retrouvez ce morceau dans notre vitrine</h3>
          {products.length > 0 ? (
            <div className="product-grid">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          ) : (
            <div className="cut-missing">
              <Lightbulb size={20} aria-hidden="true" />
              <p>
                <strong>Vous ne trouvez pas ce morceau dans notre vitrine en ligne ?</strong>
                Notre sélection évolue chaque jour. Ajoutez-le à votre liste de courses : notre équipe vous confirmera sa
                disponibilité.
              </p>
            </div>
          )}
          <div className="cut-request">
            <button type="button" className="button primary" onClick={onRequest} disabled={added}>
              <NotebookPen size={18} /> {added ? "Ajouté à votre liste…" : "Demander ce morceau"}
            </button>
            <span className="fine">
              Ajouté à <Link href="/liste-de-courses">Ma liste de courses</Link> : vous précisez la quantité, rien n’est
              envoyé sans votre validation.
            </span>
          </div>
        </section>
      )}
    </article>
  );
}
