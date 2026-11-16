"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ORDERS_KEY } from "./checkout";

type Data = {
  balance: number;
  history: { at: string; type: string; points: number; reason: string }[];
  rules: { threshold: number; reward: string };
};

/** Solde lu à partir d'un lien de commande enregistré sur cet appareil. */
export function LoyaltyBalance() {
  const [data, setData] = useState<Data | null | "none">(null);
  useEffect(() => {
    let tokens: string[] = [];
    try {
      const saved = JSON.parse(localStorage.getItem(ORDERS_KEY) || "[]");
      tokens = (Array.isArray(saved) ? saved : []).map((o: { token?: string }) => o.token || "").filter(Boolean);
    } catch {}
    if (!tokens.length) return setData("none");
    fetch(`/api/fidelite?token=${tokens[0]}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setData(d.enabled ? d : "none"))
      .catch(() => setData("none"));
  }, []);
  if (data === null) return <p className="muted">Chargement de votre solde…</p>;
  if (data === "none")
    return (
      <section className="card">
        <h2>Votre solde</h2>
        <p className="muted">
          Votre solde apparaît ici après une commande passée depuis cet appareil. Il est aussi consultable en boutique.
        </p>
        <Link className="button outline small" href="/boutique">
          Voir la boutique
        </Link>
      </section>
    );
  return (
    <section className="card">
      <h2>Votre solde : {data.balance} points</h2>
      <p className="muted">
        {data.balance >= data.rules.threshold
          ? `Vous pouvez profiter de : ${data.rules.reward}. Demandez-le au comptoir.`
          : `Encore ${data.rules.threshold - data.balance} points avant : ${data.rules.reward}.`}
      </p>
      {data.history.length > 0 && (
        <ul className="plain-list">
          {data.history.map((h, n) => (
            <li key={n}>
              {new Date(h.at).toLocaleDateString("fr-FR")} · {h.reason} · {h.points > 0 ? `+${h.points}` : h.points}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
