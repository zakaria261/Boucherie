"use client";
import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import type { PublicProduct } from "@/lib/types";
import { ProductCard } from "./product-card";
import { Photo } from "./photo";

export type Slide = {
  id: string;
  kicker: string;
  title: string;
  text: string;
  cta: string;
  href: string;
  image: string;
  /** Teinte de fond du panneau de texte. */
  tone?: "sand" | "stone" | "blush";
};

const reduced = () =>
  typeof window !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Carrousel d'accueil : diapositives arrondies, voisines visibles sur les
 * côtés, défilement automatique suspendu au survol, au toucher et au focus.
 */
export function HeroSlider({ slides }: { slides: Slide[] }) {
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const id = useId();

  const go = useCallback((n: number) => {
    const el = track.current;
    if (!el) return;
    const items = el.children;
    const target = items[(n + items.length) % items.length] as HTMLElement | undefined;
    if (!target) return;
    el.scrollTo({
      left: target.offsetLeft - (el.clientWidth - target.clientWidth) / 2,
      behavior: reduced() ? "auto" : "smooth",
    });
  }, []);

  // Diapositive courante : celle dont le centre est le plus proche du centre.
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const mid = el.scrollLeft + el.clientWidth / 2;
        let best = 0;
        let dist = Infinity;
        Array.from(el.children).forEach((c, i) => {
          const s = c as HTMLElement;
          const d = Math.abs(s.offsetLeft + s.clientWidth / 2 - mid);
          if (d < dist) {
            dist = d;
            best = i;
          }
        });
        setIndex(best);
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    if (paused || slides.length < 2 || reduced()) return;
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") go(index + 1);
    }, 6500);
    return () => clearInterval(timer);
  }, [paused, index, slides.length, go]);

  return (
    <section
      className="slider"
      aria-roledescription="carrousel"
      aria-label="À la une"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
    >
      <div className="slider-track" ref={track} id={id}>
        {slides.map((s, i) => (
          <article
            key={s.id}
            className={`slide tone-${s.tone || "sand"}`}
            aria-roledescription="diapositive"
            aria-label={`${i + 1} sur ${slides.length} : ${s.title}`}
            aria-hidden={i !== index}
            onClick={i !== index ? () => go(i) : undefined}
          >
            <div className="slide-text">
              <span className="slide-kicker">{s.kicker}</span>
              <h2>{s.title}</h2>
              <p>{s.text}</p>
              <Link className="button pill" href={s.href} tabIndex={i === index ? 0 : -1}>
                {s.cta} <ArrowRight size={17} aria-hidden="true" />
              </Link>
            </div>
            <div className="slide-photo">
              <Photo src={s.image} sizes="(min-width: 900px) 640px, 100vw" preload={i === 0} />
            </div>
          </article>
        ))}
      </div>
      {slides.length > 1 && (
        <div className="slider-nav">
          <button type="button" className="round-btn" aria-label="Diapositive précédente" aria-controls={id} onClick={() => go(index - 1)}>
            <ChevronLeft size={20} />
          </button>
          <div className="slider-dots">
            {slides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                aria-label={`Afficher : ${s.title}`}
                aria-current={i === index}
                aria-controls={id}
                onClick={() => go(i)}
              />
            ))}
          </div>
          <button type="button" className="round-btn" aria-label="Diapositive suivante" aria-controls={id} onClick={() => go(index + 1)}>
            <ChevronRight size={20} />
          </button>
        </div>
      )}
    </section>
  );
}

/** Rangée défilante avec flèches (desktop) et glissement (mobile). */
export function Rail({
  title,
  link,
  children,
  label,
  wide = false,
}: {
  title?: React.ReactNode;
  link?: { href: string; label: string };
  children: React.ReactNode;
  label: string;
  wide?: boolean;
}) {
  const track = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ start: true, end: false });
  const update = useCallback(() => {
    const el = track.current;
    if (!el) return;
    setEdge({ start: el.scrollLeft < 8, end: el.scrollLeft + el.clientWidth > el.scrollWidth - 8 });
  }, []);
  useEffect(() => {
    update();
    const el = track.current;
    el?.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [update, children]);
  const move = (dir: number) =>
    track.current?.scrollBy({ left: dir * track.current.clientWidth * 0.85, behavior: reduced() ? "auto" : "smooth" });

  return (
    <div className={`rail ${wide ? "wide" : ""}`}>
      <div className="rail-head">
        {title}
        <div className="rail-tools">
          {link && (
            <Link className="rail-link" href={link.href}>
              {link.label}
            </Link>
          )}
          <button type="button" className="round-btn" aria-label={`${label} : précédent`} disabled={edge.start} onClick={() => move(-1)}>
            <ChevronLeft size={20} />
          </button>
          <button type="button" className="round-btn" aria-label={`${label} : suivant`} disabled={edge.end} onClick={() => move(1)}>
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
      <div className="rail-track" ref={track} role="list" aria-label={label}>
        {children}
      </div>
    </div>
  );
}

/** Rayon à onglets (promotions, choix du boucher, prêt aujourd'hui). */
export function ProductTabs({
  tabs,
}: {
  tabs: { id: string; label: string; href: string; products: PublicProduct[] }[];
}) {
  const [active, setActive] = useState(tabs[0]?.id);
  const current = tabs.find((t) => t.id === active) || tabs[0];
  const id = useId();
  if (!current) return null;
  return (
    <Rail
      label={current.label}
      link={{ href: current.href, label: "Voir tout" }}
      title={
        <div className="tabs" role="tablist" aria-label="Sélections">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`${id}-${t.id}`}
              aria-selected={t.id === current.id}
              onClick={() => setActive(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      }
    >
      {current.products.map((p) => (
        <div role="listitem" className="rail-item" key={`${current.id}-${p.id}`}>
          <ProductCard product={p} />
        </div>
      ))}
    </Rail>
  );
}
