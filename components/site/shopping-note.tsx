"use client";
import { useEffect, useState } from "react";
import { Download, NotebookPen, Printer } from "lucide-react";
import { freeQuantity, itemLabel } from "@/lib/requests";
import { formatTime, longDate } from "@/lib/shop";
import type { OrderItem } from "@/lib/types";

/**
 * Note de courses du client. Les cases sont personnelles : elles servent à
 * vérifier sa liste au retrait, restent sur cet appareil et n'ont aucun effet
 * sur la préparation en boutique.
 */
export function ShoppingNote({
  token,
  reference,
  title,
  items,
  date,
  time,
  notes,
  documentLabel,
}: {
  token: string;
  reference: string;
  title: string;
  items: OrderItem[];
  date: string;
  time: string;
  notes: string;
  documentLabel: string;
}) {
  const key = `faubourg-coche:${token}`;
  const [checked, setChecked] = useState<number[]>([]);
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(key) || "[]");
      if (Array.isArray(saved)) setChecked(saved.filter((n) => Number.isInteger(n)));
    } catch {}
  }, [key]);
  const toggle = (index: number) =>
    setChecked((current) => {
      const next = current.includes(index) ? current.filter((n) => n !== index) : [...current, index];
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {}
      return next;
    });

  return (
    <section className="shopping-note-wrap">
      <article className="paper-note printable" aria-label={title}>
        <header>
          <NotebookPen size={22} aria-hidden="true" />
          <div>
            <strong>{title}</strong>
            <small>Référence {reference}</small>
          </div>
        </header>
        <p className="paper-slot">
          Retrait {date ? longDate(date) : "à convenir"}
          {time ? ` à ${formatTime(time)}` : ""}
        </p>
        <ul className="checklist">
          {items.map((item, index) => {
            const label = item.kind === "libre" ? item.name : itemLabel(item);
            const qty = item.kind === "libre" ? freeQuantity(item.quantity, item.unit) : "";
            const note =
              item.kind === "libre"
                ? [item.cut, item.portionGrams ? `${item.portionGrams} g par pièce` : "", item.packaging, item.note]
                    .filter(Boolean)
                    .join(" · ")
                : item.options.join(" · ");
            return (
              <li key={index}>
                <label>
                  <input type="checkbox" checked={checked.includes(index)} onChange={() => toggle(index)} />
                  <span>
                    <strong>{label}</strong>
                    {note && <small>{note}</small>}
                  </span>
                  {qty && <b>{qty}</b>}
                </label>
              </li>
            );
          })}
        </ul>
        {notes && (
          <p className="paper-notes">
            <strong>Instructions :</strong> {notes}
          </p>
        )}
        <p className="paper-hint">Cases à cocher pour vous : elles vous aident à vérifier votre liste au retrait.</p>
      </article>
      <div className="row-actions center no-print">
        <a className="button outline small" href={`/api/documents/commande/${token}?telecharger=1`} download>
          <Download size={16} /> Télécharger {documentLabel}
        </a>
        <button type="button" className="button outline small" onClick={() => window.print()}>
          <Printer size={16} /> Imprimer {documentLabel}
        </button>
      </div>
    </section>
  );
}
