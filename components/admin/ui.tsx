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
  const [compact, setCompact] = useState(!large);
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
              <ChevronLeft size={26} strokeWidth={2.2} />
              <span>{back.label}</span>
            </Link>
          )}
        </div>
        <span className="nav-bar-title" aria-hidden={large && !compact}>
          {title}
        </span>
        <div className="nav-bar-side end">{actions}</div>
      </header>
      {large && (
        <div className="large-title">
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
    if (open && !dialog.open) {
      dialog.showModal();
      setConfirming(false);
      document.documentElement.classList.add("sheet-open");
    } else if (!open && dialog.open) {
      dialog.close();
    }
    if (!open) document.documentElement.classList.remove("sheet-open");
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

  function onPointerDown(e: React.PointerEvent) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
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
    if (!drag.current || !panel.current) return;
    const { dy, t } = drag.current;
    const velocity = dy / Math.max(1, Date.now() - t);
    drag.current = null;
    panel.current.style.transition = "";
    panel.current.style.transform = "";
    if (dy > 140 || (dy > 40 && velocity > 0.6)) requestClose();
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
      <div className="sheet-panel" ref={panel}>
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
  Nouvelle: "orange",
  Confirmée: "blue",
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
