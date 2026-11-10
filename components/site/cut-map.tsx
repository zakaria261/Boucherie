"use client";
import { useState } from "react";
import { animals, decor, facets, type Animal } from "@/lib/cuts";
import { ProductCard } from "./product-card";
import { useShop } from "./store";

export function CutMap() {
  const { products } = useShop();
  const [animalId, setAnimalId] = useState(animals[0].id);
  const animal = animals.find((a) => a.id === animalId) as Animal;
  const [cutId, setCutId] = useState(animal.cuts[0].id);
  const cut = animal.cuts.find((c) => c.id === cutId) || animal.cuts[0];
  const linked = products.filter((p) => cut.productIds.includes(p.id));

  return (
    <div className="cut-map">
      <div className="chips" role="tablist" aria-label="Animal">
        {animals.map((a) => (
          <button
            key={a.id}
            role="tab"
            aria-selected={a.id === animalId}
            aria-pressed={a.id === animalId}
            onClick={() => {
              setAnimalId(a.id);
              setCutId(a.cuts[0].id);
            }}
          >
            {a.name}
          </button>
        ))}
      </div>
      <figure className="cut-figure">
        <svg viewBox="0 0 640 345" role="group" aria-label={`Morceaux du ${animal.name.toLowerCase()}`}>
          <polygon className="cut-decor" points={decor.head} />
          {animal.horns && (
            <polyline className="cut-horn" points="72,80 60,48 84,30 96,62 122,88" />
          )}
          <polygon className="cut-decor" points={decor.hoofFront} />
          <polygon className="cut-decor" points={decor.hoofRear} />
          <polyline className="cut-horn" points="598,130 618,180 610,220" />
          {animal.cuts.map((c) => (
            <g
              key={c.id}
              className={`cut-zone ${c.id === cut.id ? "selected" : ""}`}
              role="button"
              tabIndex={0}
              aria-label={c.name}
              aria-pressed={c.id === cut.id}
              onClick={() => setCutId(c.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setCutId(c.id);
                }
              }}
            >
              {c.facets.map((f) => (
                <polygon key={f} points={facets[f]} />
              ))}
            </g>
          ))}
        </svg>
        <figcaption className="sr-only">
          Schéma simplifié. Choisissez un morceau sur le dessin ou dans la liste.
        </figcaption>
      </figure>
      <div className="chips wrap" aria-label="Liste des morceaux">
        {animal.cuts.map((c) => (
          <button key={c.id} aria-pressed={c.id === cut.id} onClick={() => setCutId(c.id)}>
            {c.name}
          </button>
        ))}
      </div>
      <section className="card cut-info" aria-live="polite">
        <h2>{cut.name}</h2>
        <dl className="facts">
          <div>
            <dt>Où se trouve-t-il ?</dt>
            <dd>{cut.location}</dd>
          </div>
          <div>
            <dt>Caractère</dt>
            <dd>{cut.character}</dd>
          </div>
          <div>
            <dt>En cuisine</dt>
            <dd>{cut.uses}</dd>
          </div>
        </dl>
        {linked.length > 0 ? (
          <div className="product-grid">
            {linked.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : (
          <p className="fine">Pas en ligne pour le moment : demandez-le au comptoir.</p>
        )}
      </section>
    </div>
  );
}
