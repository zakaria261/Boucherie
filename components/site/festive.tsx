"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Check, Flame, NotebookPen, Plus } from "lucide-react";
import type { FestiveItem, FestiveSection } from "@/lib/fetes";
import { listNames, removeFromList, requestFromGuide } from "./shopping-list-form";

/** Nom inscrit dans la liste : l'unité distingue les produits homonymes. */
const listLabel = (it: FestiveItem) => {
  const unit = it.details.find((d) => d.startsWith("Unité : "));
  return unit ? `${it.name} (${unit.slice(8)})` : it.name;
};

/**
 * Catalogue des fêtes : chaque produit s'ajoute à la liste de courses (sans
 * envoi). Le client indique ensuite quantités et retrait, puis valide.
 */
export function FestiveCatalogView({ sections }: { sections: FestiveSection[] }) {
  const [inList, setInList] = useState<string[]>([]);
  useEffect(() => setInList(listNames()), []);
  const has = (name: string) => inList.some((n) => n.toLowerCase() === name.toLowerCase());
  const added = sections.flatMap((s) => s.items).filter((it) => has(listLabel(it))).length;

  function toggle(name: string) {
    if (has(name)) removeFromList(name);
    else requestFromGuide(name);
    setInList(listNames());
  }

  return (
    <>
      <nav className="festive-nav" aria-label="Rubriques du catalogue">
        {sections.map((s) => (
          <a key={s.id} href={`#${s.id}`}>
            {s.title}
          </a>
        ))}
      </nav>
      {sections.map((s) => (
        <section className="lots-block festive-section" id={s.id} key={s.id} aria-labelledby={`${s.id}-titre`}>
          <h2 id={`${s.id}-titre`}>{s.title}</h2>
          {s.intro && <p className="festive-intro">{s.intro}</p>}
          <div className="festive-grid">
            {s.items.map((it) => {
              const on = has(listLabel(it));
              return (
                <article className="festive-card" key={it.id} aria-labelledby={`${it.id}-nom`}>
                  <h3 id={`${it.id}-nom`}>{it.name}</h3>
                  {it.details.length > 0 && (
                    <ul className="festive-details">
                      {it.details.map((d) => (
                        <li key={d}>{d}</li>
                      ))}
                    </ul>
                  )}
                  {it.description && <p>{it.description}</p>}
                  {it.cooking && (
                    <p className="festive-cooking">
                      <Flame size={16} aria-hidden="true" />
                      <span>
                        <strong>Cuisson :</strong> {it.cooking}
                      </span>
                    </p>
                  )}
                  <button
                    type="button"
                    className={`button ${on ? "outline" : "primary"} full`}
                    aria-pressed={on}
                    aria-label={on ? `${listLabel(it)} : dans ma liste, retirer` : `Ajouter ${listLabel(it)} à ma liste`}
                    onClick={() => toggle(listLabel(it))}
                  >
                    {on ? (
                      <>
                        <Check size={17} /> Dans ma liste
                      </>
                    ) : (
                      <>
                        <Plus size={17} /> Ajouter à ma liste
                      </>
                    )}
                  </button>
                </article>
              );
            })}
          </div>
        </section>
      ))}
      {added > 0 && (
        <div className="festive-bar" role="status">
          <span>
            <NotebookPen size={18} aria-hidden="true" />
            {added} produit{added > 1 ? "s" : ""} dans ma liste
          </span>
          <Link className="button primary small" href="/liste-de-courses">
            Finaliser ma liste <ArrowRight size={16} />
          </Link>
        </div>
      )}
    </>
  );
}
