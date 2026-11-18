"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Download, Expand, X } from "lucide-react";

type Spread = { left?: number; right?: number };
type Turn = { dir: "next" | "prev"; to: number };

const DURATION = 650;

/** Découpe en doubles pages : couverture seule à droite, puis paires. */
function spreadsOf(count: number): Spread[] {
  const list: Spread[] = [{ right: 0 }];
  for (let i = 1; i < count; i += 2) list.push(i + 1 < count ? { left: i, right: i + 1 } : { left: i });
  return list;
}

/**
 * Livret à feuilleter : doubles pages sur ordinateur, page par page sur
 * téléphone (glisser du doigt), avec animation de page tournée, vignettes,
 * plein écran et téléchargement du PDF.
 */
export function Flipbook({ title, pages, pdf }: { title: string; pages: string[]; pdf?: string }) {
  const [wide, setWide] = useState(false);
  const [index, setIndex] = useState(0); // double page (large) ou page (étroit)
  const [turn, setTurn] = useState<Turn | null>(null);
  const [zoom, setZoom] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const zoomDialog = useRef<HTMLDialogElement>(null);
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const spreads = useMemo(() => spreadsOf(pages.length), [pages.length]);

  // Doubles pages à partir de 860 px ; la page affichée est conservée.
  useEffect(() => {
    const mq = matchMedia("(min-width: 860px)");
    const apply = () =>
      setWide((was) => {
        if (was === mq.matches) return was;
        setIndex((i) => {
          if (mq.matches) return Math.max(0, spreads.findIndex((s) => s.left === i || s.right === i));
          const s = spreads[i];
          return s?.left ?? s?.right ?? 0;
        });
        return mq.matches;
      });
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [spreads]);

  const last = wide ? spreads.length - 1 : pages.length - 1;
  const go = useCallback(
    (dir: "next" | "prev", target?: number) => {
      if (turn) return;
      const to = target ?? (dir === "next" ? index + 1 : index - 1);
      if (to < 0 || to > last || to === index) return;
      if (matchMedia("(prefers-reduced-motion: reduce)").matches || target !== undefined) {
        setIndex(to);
        return;
      }
      setTurn({ dir, to });
    },
    [index, last, turn],
  );
  useEffect(() => {
    if (!turn) return;
    const timer = setTimeout(() => {
      setIndex(turn.to);
      setTurn(null);
    }, DURATION);
    return () => clearTimeout(timer);
  }, [turn]);

  // Précharge les pages voisines pour une lecture fluide.
  useEffect(() => {
    const around = wide
      ? [spreads[index + 1], spreads[index - 1]].flatMap((s) => (s ? [s.left, s.right] : []))
      : [index + 1, index - 1];
    for (const n of around) if (n !== undefined && pages[n]) new Image().src = pages[n];
  }, [index, wide, spreads, pages]);

  const shown = wide ? spreads[index] : { right: index };
  const label = wide
    ? [shown.left, shown.right].filter((n) => n !== undefined).map((n) => n! + 1).join("–")
    : String(index + 1);
  const page = (n: number | undefined, cls: string) =>
    n === undefined ? (
      <div className={`fb-page ${cls} fb-blank`} />
    ) : (
      <div className={`fb-page ${cls}`}>
        <img src={pages[n]} alt={`${title}, page ${n + 1}`} draggable={false} decoding="async" loading={n < 3 ? "eager" : "lazy"} />
      </div>
    );

  // Pages visibles pendant l'animation (dessous) et feuille qui tourne.
  let under: Spread = shown;
  let leaf: { front?: number; back?: number; side: "left" | "right"; dir: "next" | "prev" } | null = null;
  if (turn && wide) {
    const target = spreads[turn.to];
    if (turn.dir === "next") {
      under = { left: shown.left, right: target.right };
      leaf = { front: shown.right, back: target.left, side: "right", dir: "next" };
    } else {
      under = { left: target.left, right: shown.right };
      leaf = { front: shown.left, back: target.right, side: "left", dir: "prev" };
    }
  } else if (turn) {
    if (turn.dir === "next") {
      under = { right: turn.to };
      leaf = { front: index, side: "right", dir: "next" };
    } else {
      under = { right: index };
      leaf = { front: turn.to, side: "right", dir: "prev" };
    }
  }

  const thumbs = wide ? spreads : pages.map((_, n) => ({ right: n }) as Spread);
  const currentThumb = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    currentThumb.current?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [index, wide]);

  return (
    <section
      className={`flipbook ${wide ? "wide" : "narrow"}`}
      aria-roledescription="livret"
      aria-label={title}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") go("next");
        if (e.key === "ArrowLeft") go("prev");
      }}
    >
      <div
        ref={stage}
        className={`fb-stage ${wide && shown.left === undefined && !turn ? "cover" : ""}`}
        tabIndex={0}
        onPointerDown={(e) => {
          if (e.pointerType !== "mouse") swipe.current = { x: e.clientX, y: e.clientY };
        }}
        onPointerUp={(e) => {
          const s = swipe.current;
          swipe.current = null;
          if (!s) return;
          const dx = e.clientX - s.x;
          if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(e.clientY - s.y)) go(dx < 0 ? "next" : "prev");
        }}
        onPointerCancel={() => (swipe.current = null)}
      >
        <div className="fb-book">
          {wide && page(under.left, "left")}
          {page(under.right, "right")}
          {leaf && (
            <div className={`fb-leaf ${leaf.side} ${leaf.dir}`} style={{ animationDuration: `${DURATION}ms` }} aria-hidden="true">
              <div className="fb-face front">{leaf.front !== undefined && <img src={pages[leaf.front]} alt="" draggable={false} />}</div>
              <div className="fb-face back">{leaf.back !== undefined && <img src={pages[leaf.back]} alt="" draggable={false} />}</div>
            </div>
          )}
        </div>
        <button type="button" className="fb-arrow prev" aria-label="Page précédente" disabled={index === 0} onClick={() => go("prev")}>
          <ChevronLeft size={26} />
        </button>
        <button type="button" className="fb-arrow next" aria-label="Page suivante" disabled={index === last} onClick={() => go("next")}>
          <ChevronRight size={26} />
        </button>
      </div>

      <div className="fb-bar">
        <span className="fb-count" aria-live="polite">
          Page {label} <span>/ {pages.length}</span>
        </span>
        <div className="fb-actions">
          <button type="button" className="button outline small" onClick={() => (setZoom(true), requestAnimationFrame(() => zoomDialog.current?.showModal()))}>
            <Expand size={16} /> Plein écran
          </button>
          {pdf && (
            <a className="button outline small" href={pdf} download>
              <Download size={16} /> PDF
            </a>
          )}
        </div>
      </div>

      <div className="fb-thumbs" role="group" aria-label="Aller à la page">
        {thumbs.map((s, n) => {
          const first = s.left ?? s.right!;
          return (
            <button
              key={n}
              ref={n === index ? currentThumb : undefined}
              type="button"
              aria-current={n === index ? "page" : undefined}
              aria-label={`Page ${[s.left, s.right].filter((x) => x !== undefined).map((x) => x! + 1).join(" et ")}`}
              onClick={() => go(n > index ? "next" : "prev", n)}
            >
              {[s.left, s.right].map((x, k) =>
                x === undefined ? null : <img key={k} src={pages[x]} alt="" loading="lazy" decoding="async" />,
              )}
              <span>{first + 1}</span>
            </button>
          );
        })}
      </div>

      {zoom && (
        <dialog ref={zoomDialog} className="fb-zoom" aria-label={`${title}, plein écran`} onClose={() => setZoom(false)}>
          <button type="button" className="fb-zoom-close icon-btn" aria-label="Fermer" onClick={() => zoomDialog.current?.close()}>
            <X size={24} />
          </button>
          <div className="fb-zoom-pages">
            {[shown.left, shown.right].map((x) =>
              x === undefined ? null : <img key={x} src={pages[x]} alt={`${title}, page ${x + 1}`} />,
            )}
          </div>
        </dialog>
      )}
    </section>
  );
}
