"use client";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Check, ChevronLeft, ChevronRight, Minus, Plus } from "lucide-react";
import type { OrderStatus } from "@/lib/types";
import { haptic } from "./api";

/* ——— Barre de navigation à grand titre ——— */
/** Navigation façon iOS : glisser vers la gauche en avançant, vers la droite au retour. */
export const PUSH = ["nav-push"];
export const POP = ["nav-pop"];

export function NavHeader({
  title,
  eyebrow,
  subtitle,
  back,
  actions,
  large = true,
}: {
  title: string;
  eyebrow?: string;
  subtitle?: ReactNode;
  back?: { href: string; label: string };
  actions?: ReactNode;
  large?: boolean;
}) {
  const sentinel = useRef<HTMLHeadingElement>(null);
  const block = useRef<HTMLDivElement>(null);
  const [compact, setCompact] = useState(!large);
  useEffect(() => {
    if (!large || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const paint = () => {
      frame = 0;
      const el = block.current;
      if (!el) return;
      const y = window.scrollY;
      if (y < 0) {
        // Rebond en haut de l'écran : le titre grandit légèrement, comme sur iOS.
        el.style.transform = `scale(${1 + Math.min(0.1, -y / 500)})`;
        el.style.opacity = "1";
      } else {
        const p = Math.min(1, y / 44);
        el.style.transform = p ? `scale(${1 - p * 0.05})` : "";
        el.style.opacity = p ? String(1 - p) : "";
      }
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(paint);
    };
    paint();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [large]);
  useEffect(() => {
    if (!large || !sentinel.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => setCompact(!entry.isIntersecting),
      { rootMargin: "-52px 0px 0px 0px", threshold: 0 },
    );
    observer.observe(sentinel.current);
    return () => observer.disconnect();
  }, [large]);
  return (
    <>
      <header className={`nav-bar ${compact ? "compact" : ""}`}>
        <div className="nav-bar-side">
          {back && (
            <Link href={back.href} className="nav-back" transitionTypes={POP}>
              <ChevronLeft size={26} strokeWidth={2.2} aria-hidden="true" />
              <span className="sr-only">{back.label}</span>
            </Link>
          )}
        </div>
        <span className="nav-bar-title" aria-hidden={large && !compact}>
          {title}
        </span>
        <div className="nav-bar-side end">{actions}</div>
      </header>
      {large && (
        <div className="large-title" ref={block}>
          {eyebrow && <span className="large-eyebrow">{eyebrow}</span>}
          <h1 ref={sentinel}>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
      )}
      {!large && <h1 className="sr-only">{title}</h1>}
    </>
  );
}

/* ——— Feuille modale ——— */
export function Sheet({
  open,
  onClose,
  title,
  children,
  dirty = false,
  actions,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Demande une confirmation avant de fermer. */
  dirty?: boolean;
  /** Bouton à droite de l'en-tête (ex. « OK »). */
  actions?: ReactNode;
  footer?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const drag = useRef<{ y: number; t: number; dy: number } | null>(null);
  const [confirming, setConfirming] = useState(false);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open) {
      dialog.classList.remove("closing");
      if (!dialog.open) {
        if (panel.current) panel.current.style.transform = "";
        dialog.showModal();
        panel.current?.focus({ preventScroll: true });
        setConfirming(false);
        document.documentElement.classList.add("sheet-open");
      }
      return;
    }
    document.documentElement.classList.remove("sheet-open");
    if (!dialog.open) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      dialog.close();
      return;
    }
    // La feuille redescend avant de disparaître.
    dialog.classList.add("closing");
    const timer = setTimeout(() => {
      dialog.classList.remove("closing");
      dialog.close();
      if (panel.current) panel.current.style.transform = "";
    }, 280);
    return () => clearTimeout(timer);
  }, [open]);
  useEffect(
    () => () => document.documentElement.classList.remove("sheet-open"),
    [],
  );

  const requestClose = useCallback(() => {
    if (dirty) {
      setConfirming(true);
      haptic("warning");
      return;
    }
    onClose();
  }, [dirty, onClose]);
  const closeRef = useRef(requestClose);
  closeRef.current = requestClose;
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;

  /** Relâchement d'un glissement : fermeture si assez loin ou assez vite. */
  const release = useCallback((dy: number, t: number) => {
    const el = panel.current;
    if (!el) return;
    const velocity = dy / Math.max(1, Date.now() - t);
    el.style.transition = "";
    if (dy > 140 || (dy > 40 && velocity > 0.6)) {
      // Modifications en cours : la feuille revient et demande confirmation.
      if (dirtyRef.current) el.style.transform = "";
      closeRef.current();
    } else el.style.transform = "";
  }, []);

  // Au doigt : la feuille se tire vers le bas depuis la poignée, l'en-tête,
  // ou le contenu lorsqu'il est déjà en haut (comme les feuilles iOS).
  useEffect(() => {
    const el = panel.current;
    if (!el) return;
    let startY = 0;
    let t = 0;
    let dy = 0;
    let armed = false;
    let tracking = false;
    const start = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      armed = false;
      tracking = false;
      if (e.touches.length !== 1 || target.closest("input, textarea, select, [contenteditable]")) return;
      const body = target.closest(".sheet-body") as HTMLElement | null;
      armed = !body || body.scrollTop <= 0;
      startY = e.touches[0].clientY;
      t = Date.now();
      dy = 0;
    };
    const move = (e: TouchEvent) => {
      if (!armed) return;
      const d = e.touches[0].clientY - startY;
      if (!tracking) {
        if (d < -4) armed = false;
        if (d <= 6) return;
        tracking = true;
      }
      e.preventDefault();
      // Légère résistance, comme un élastique.
      dy = Math.max(0, d) * 0.9;
      el.style.transition = "none";
      el.style.transform = `translateY(${dy}px)`;
    };
    const end = () => {
      if (tracking) release(dy, t);
      armed = false;
      tracking = false;
    };
    el.addEventListener("touchstart", start, { passive: true });
    el.addEventListener("touchmove", move, { passive: false });
    el.addEventListener("touchend", end);
    el.addEventListener("touchcancel", end);
    return () => {
      el.removeEventListener("touchstart", start);
      el.removeEventListener("touchmove", move);
      el.removeEventListener("touchend", end);
      el.removeEventListener("touchcancel", end);
    };
  }, [release]);

  // À la souris (ordinateur) : glisser la poignée.
  function onPointerDown(e: React.PointerEvent) {
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    // Les boutons de l'en-tête gardent leur comportement normal.
    if ((e.target as HTMLElement).closest("button, a, input")) return;
    drag.current = { y: e.clientY, t: Date.now(), dy: 0 };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current || !panel.current) return;
    const dy = Math.max(0, e.clientY - drag.current.y);
    drag.current.dy = dy;
    panel.current.style.transition = "none";
    panel.current.style.transform = `translateY(${dy}px)`;
  }
  function onPointerUp() {
    if (!drag.current) return;
    const { dy, t } = drag.current;
    drag.current = null;
    release(dy, t);
  }

  return (
    <dialog
      ref={ref}
      className="sheet"
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        requestClose();
      }}
      onClose={() => {
        if (open) onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) requestClose();
      }}
    >
      {/* Focus initial sur la feuille elle-même : pas d'anneau sur « Fermer ». */}
      <div className="sheet-panel" ref={panel} tabIndex={-1}>
        <div
          className="sheet-grabber"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <span className="sheet-handle" aria-hidden="true" />
          <div className="sheet-head">
            <button type="button" className="sheet-cancel" onClick={requestClose}>
              {dirty ? "Annuler" : "Fermer"}
            </button>
            <h2 id={titleId}>{title}</h2>
            <div className="sheet-head-end">{actions}</div>
          </div>
        </div>
        {confirming && (
          <div className="sheet-confirm" role="alertdialog" aria-label="Modifications non enregistrées">
            <p>Abandonner les modifications non enregistrées ?</p>
            <div>
              <button type="button" className="btn tinted" onClick={() => setConfirming(false)}>
                Continuer
              </button>
              <button type="button" className="btn destructive" onClick={onClose}>
                Abandonner
              </button>
            </div>
          </div>
        )}
        <div className="sheet-body">{children}</div>
        {footer && <div className="sheet-footer">{footer}</div>}
      </div>
    </dialog>
  );
}

/* ——— Listes groupées ——— */
export function Section({
  title,
  footer,
  children,
  className = "",
}: {
  title?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`group ${className}`}>
      {title && <h2 className="group-title">{title}</h2>}
      <div className="group-body">{children}</div>
      {footer && <p className="group-footer">{footer}</p>}
    </section>
  );
}

export function Row({
  href,
  onClick,
  icon,
  label,
  detail,
  value,
  chevron = true,
  destructive,
  external,
}: {
  href?: string;
  onClick?: () => void;
  icon?: ReactNode;
  label: ReactNode;
  detail?: ReactNode;
  value?: ReactNode;
  chevron?: boolean;
  destructive?: boolean;
  external?: boolean;
}) {
  const inner = (
    <>
      {icon && <span className="row-icon">{icon}</span>}
      <span className="row-text">
        <span className="row-label">{label}</span>
        {detail && <span className="row-detail">{detail}</span>}
      </span>
      {value !== undefined && <span className="row-value">{value}</span>}
      {chevron && (href || onClick) && (
        <ChevronRight className="row-chevron" size={18} aria-hidden="true" />
      )}
    </>
  );
  const className = `row ${destructive ? "destructive" : ""}`;
  if (href)
    return (
      <Link transitionTypes={PUSH}
        href={href}
        className={className}
        target={external ? "_blank" : undefined}
        rel={external ? "noreferrer" : undefined}
      >
        {inner}
      </Link>
    );
  if (onClick)
    return (
      <button type="button" className={className} onClick={onClick}>
        {inner}
      </button>
    );
  return <div className={className}>{inner}</div>;
}

/* ——— Interrupteur iOS ——— */
export function Toggle({
  label,
  detail,
  checked,
  onChange,
  disabled,
}: {
  label: ReactNode;
  detail?: ReactNode;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="row toggle-row">
      <span className="row-text">
        <span className="row-label">{label}</span>
        {detail && <span className="row-detail">{detail}</span>}
      </span>
      <input
        type="checkbox"
        role="switch"
        className="switch"
        checked={checked}
        disabled={disabled}
        onChange={(e) => {
          haptic();
          onChange(e.target.checked);
        }}
      />
    </label>
  );
}

/* ——— Contrôle segmenté ——— */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string; badge?: number }[];
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div className="segmented" role="tablist" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={o.value === value}
          onClick={() => {
            if (o.value !== value) haptic();
            onChange(o.value);
          }}
        >
          {o.label}
          {!!o.badge && <span className="seg-badge">{o.badge}</span>}
        </button>
      ))}
    </div>
  );
}

/* ——— Compteur à grands boutons ——— */
export function Stepper({
  value,
  onChange,
  step = 1,
  min = 0,
  max = 100000,
  format = (v: number) => String(v),
  label,
}: {
  value: number;
  onChange: (value: number) => void;
  step?: number;
  min?: number;
  max?: number;
  format?: (value: number) => string;
  label: string;
}) {
  return (
    <div className="big-stepper" role="group" aria-label={label}>
      <button
        type="button"
        aria-label={`Diminuer ${label}`}
        disabled={value <= min}
        onClick={() => {
          haptic();
          onChange(Math.max(min, value - step));
        }}
      >
        <Minus size={22} strokeWidth={2.4} />
      </button>
      <output aria-live="polite">{format(value)}</output>
      <button
        type="button"
        aria-label={`Augmenter ${label}`}
        disabled={value >= max}
        onClick={() => {
          haptic();
          onChange(Math.min(max, value + step));
        }}
      >
        <Plus size={22} strokeWidth={2.4} />
      </button>
    </div>
  );
}

export const statusTone: Record<OrderStatus, string> = {
  "Demande reçue": "orange",
  "En attente de validation": "yellow",
  Acceptée: "blue",
  "En préparation": "indigo",
  Prête: "green",
  Retirée: "gray",
  Annulée: "red",
};

export function StatusPill({ status }: { status: OrderStatus }) {
  return <span className={`pill ${statusTone[status]}`}>{status}</span>;
}

/** Message de confirmation discret façon iOS (HUD). */
export function useHud() {
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(""), 1600);
    return () => clearTimeout(timer);
  }, [message]);
  const hud = (
    <div className={`hud ${message ? "visible" : ""}`} role="status" aria-live="polite">
      {message && <Check size={30} strokeWidth={2.5} />}
      <span>{message}</span>
    </div>
  );
  return {
    hud,
    show: (text: string) => {
      haptic("success");
      setMessage(text);
    },
  };
}

export function Empty({ icon, title, children }: { icon?: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="empty-state">
      {icon}
      <h3>{title}</h3>
      {children && <p>{children}</p>}
    </div>
  );
}

/** Sauvegarde l'état d'un écran (filtre, recherche) pour le retrouver au retour. */
export function useScreenState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const loaded = useRef(false);
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(`fp:${key}`);
      if (saved) setValue(JSON.parse(saved));
    } catch {}
    loaded.current = true;
  }, [key]);
  useEffect(() => {
    if (!loaded.current) return;
    try {
      sessionStorage.setItem(`fp:${key}`, JSON.stringify(value));
    } catch {}
  }, [key, value]);
  return [value, setValue] as const;
}
