"use client";
import Link from "next/link";
import { useState } from "react";
import { Minus, Plus, ShoppingBag } from "lucide-react";
import type { PublicProduct } from "@/lib/types";
import { formatWeight, linePrice, money } from "@/lib/shop";
import { effectivePrice, useShop } from "./store";
import { portionsFor } from "./recipe-view";

type Meal = {
  id: string;
  label: string;
  hint: string;
  /** Grammes par personne (viande crue). */
  grams: number;
  match: (p: PublicProduct) => boolean;
  /** Grammes par personne propres à un morceau (os, fonte…). */
  special?: Record<string, number>;
};

const ids = (...list: string[]) => (p: PublicProduct) => list.includes(p.id);

const meals: Meal[] = [
  {
    id: "barbecue",
    label: "Barbecue",
    hint: "Brochettes, saucisses et grillades à partager.",
    grams: 250,
    match: (p) => p.grill,
  },
  {
    id: "mijote",
    label: "Plat mijoté",
    hint: "Bourguignon, blanquette, pot-au-feu, tajine.",
    grams: 250,
    match: ids(
      "paleron", "macreuse", "jumeau", "basse-côte", "collier-de-bœuf", "plat-de-côtes",
      "jarret", "collier-de-veau", "poitrine-de-veau", "jarret-de-veau", "collier",
      "épaule", "souris",
    ),
    special: { "plat-de-côtes": 350, jarret: 300, "jarret-de-veau": 350, souris: 350 },
  },
  {
    id: "roti",
    label: "Rôti du dimanche",
    hint: "Une belle pièce au four pour la tablée.",
    grams: 200,
    match: ids("gigot", "épaule", "quasi-de-veau", "filet-de-veau", "rumsteak", "filet-de-bœuf"),
    special: { gigot: 300, "épaule": 300 },
  },
  {
    id: "rapide",
    label: "Repas rapide",
    hint: "Prêt en moins de 20 minutes, pour la semaine.",
    grams: 150,
    match: (p) =>
      p.id.startsWith("émincé") ||
      ids("escalope-de-veau", "bifteck", "steak-de-kefta", "viande-hachée", "merlan",
        "côte-d-agneau", "entrecôte-de-veau")(p),
  },
  {
    id: "fete",
    label: "Repas de fête",
    hint: "Les pièces d’exception.",
    grams: 250,
    match: ids(
      "côte-à-l-os-maturé", "faux-filet-maturé", "filet-de-bœuf", "gigot", "côte-d-agneau",
      "quasi-de-veau", "filet-de-veau",
    ),
    special: { "côte-à-l-os-maturé": 400, gigot: 300 },
  },
];

const budgets = [
  { id: "eco", label: "Petit budget", max: 500, hint: "jusqu’à 5 € / pers." },
  { id: "mid", label: "Intermédiaire", max: 1000, hint: "jusqu’à 10 € / pers." },
  { id: "all", label: "Pour se faire plaisir", max: Infinity, hint: "sans limite" },
];

export function MealPlanner() {
  const { products, add, openCart } = useShop();
  const [meal, setMeal] = useState(meals[0]),
    [guests, setGuests] = useState(4),
    [budget, setBudget] = useState(budgets[1]);

  const ideas = products
    .filter((p) => p.available && p.unit === "kg" && meal.match(p))
    .map((p) => {
      const grams = (meal.special?.[p.id] || meal.grams) * guests;
      const portion = portionsFor(p, grams)!;
      const total = linePrice(effectivePrice(p), portion.grams, portion.quantity, p.unit);
      return { p, grams, portion, total, perHead: total / guests };
    })
    .filter((x) => x.portion && x.perHead <= budget.max)
    .sort((a, b) => Number(!!b.p.promo) - Number(!!a.p.promo) || b.perHead - a.perHead)
    .slice(0, 4);

  return (
    <div className="planner">
      <fieldset>
        <legend>Quel repas ?</legend>
        <div className="choice-cards">
          {meals.map((m) => (
            <button key={m.id} aria-pressed={m.id === meal.id} onClick={() => setMeal(m)}>
              <strong>{m.label}</strong>
              <small>{m.hint}</small>
            </button>
          ))}
        </div>
      </fieldset>
      <div className="planner-row">
        <fieldset>
          <legend>Combien de convives ?</legend>
          <div className="stepper">
            <button aria-label="Moins de convives" disabled={guests <= 1} onClick={() => setGuests((g) => g - 1)}>
              <Minus size={16} />
            </button>
            <span aria-live="polite">{guests}</span>
            <button aria-label="Plus de convives" disabled={guests >= 30} onClick={() => setGuests((g) => g + 1)}>
              <Plus size={16} />
            </button>
          </div>
        </fieldset>
        <fieldset>
          <legend>Quel budget ?</legend>
          <div className="choice-row">
            {budgets.map((b) => (
              <button key={b.id} aria-pressed={b.id === budget.id} onClick={() => setBudget(b)} title={b.hint}>
                {b.label}
              </button>
            ))}
          </div>
        </fieldset>
      </div>
      <h2 className="planner-title">Nos suggestions</h2>
      {ideas.length ? (
        <ul className="ideas">
          {ideas.map(({ p, grams, portion, total, perHead }) => (
            <li key={p.id} className="card idea">
              <img src={p.image} alt="" loading="lazy" />
              <div>
                <Link className="product-name" href={`/boutique/${encodeURIComponent(p.id)}`}>
                  {p.name}
                </Link>
                <small>
                  Environ {formatWeight(grams)} pour {guests} · {money(total)} (
                  {money(Math.round(perHead))} / pers.)
                </small>
                <button
                  className="button small primary"
                  onClick={() => {
                    add(p, portion.grams, Math.min(20, portion.quantity));
                    openCart();
                  }}
                >
                  <ShoppingBag size={16} /> Ajouter {portion.quantity} × {formatWeight(portion.grams)}
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">
          Rien ne correspond à ce budget en ligne. Passez nous voir : nous
          trouverons une solution au comptoir.
        </p>
      )}
      <p className="fine">
        Quantités indicatives de viande crue par personne. Votre boucher ajuste
        volontiers selon les appétits.
      </p>
    </div>
  );
}
