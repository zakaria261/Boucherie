"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  CalendarDays,
  CircleEllipsis,
  Megaphone,
  Package,
  ShoppingBag,
  BellRing,
  WifiOff,
} from "lucide-react";
import type { Order, OrderStatus } from "@/lib/types";
import { api, haptic } from "./api";

type OrdersContext = {
  orders: Order[];
  refresh: () => Promise<void>;
  replace: (order: Order) => void;
  setStatus: (order: Order, status: OrderStatus, paidAmount?: number) => Promise<Order>;
  offline: boolean;
};
const Orders = createContext<OrdersContext | null>(null);
export function useOrders() {
  const value = useContext(Orders);
  if (!value) throw new Error("Orders unavailable");
  return value;
}

const tabs = [
  { href: "/admin", label: "Aujourd’hui", icon: CalendarDays },
  { href: "/admin/commandes", label: "Commandes", icon: ShoppingBag },
  { href: "/admin/produits", label: "Produits", icon: Package },
  { href: "/admin/publications", label: "Publications", icon: Megaphone },
  { href: "/admin/plus", label: "Plus", icon: CircleEllipsis },
];
const extra: Record<string, string> = {
  "/admin/stock": "/admin/produits",
  "/admin/boutique": "/admin/plus",
};

export function AdminShell({
  children,
  initialOrders,
  logo,
}: {
  children: React.ReactNode;
  initialOrders: Order[];
  logo: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [orders, setOrders] = useState(initialOrders);
  const [offline, setOffline] = useState(false);
  const [banner, setBanner] = useState<Order | null>(null);
  const known = useRef(new Set(initialOrders.map((o) => o.id)));

  useEffect(() => {
    // Les données du serveur font foi à chaque navigation.
    setOrders(initialOrders);
    initialOrders.forEach((o) => known.current.add(o.id));
  }, [initialOrders]);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/orders", { cache: "no-store" });
      if (response.status === 401) {
        window.location.assign(`/admin/connexion?suite=${encodeURIComponent(location.pathname)}`);
        return;
      }
      if (!response.ok) throw new Error();
      const { orders: next } = (await response.json()) as { orders: Order[] };
      setOffline(false);
      const fresh = next.filter((o) => !known.current.has(o.id));
      next.forEach((o) => known.current.add(o.id));
      setOrders(next);
      if (fresh.length) {
        setBanner(fresh[0]);
        haptic("success");
      }
    } catch {
      setOffline(true);
    }
  }, []);

  // Actualisation fiable : au retour au premier plan, au retour du réseau et
  // toutes les 20 secondes tant que l'application est visible.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const timer = setInterval(onVisible, 20000);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    window.addEventListener("online", onVisible);
    window.addEventListener("offline", () => setOffline(true));
    // Message du service worker : une notification a été reçue.
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type === "refresh-orders") void refresh();
    };
    navigator.serviceWorker?.addEventListener("message", onMessage);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      window.removeEventListener("online", onVisible);
      navigator.serviceWorker?.removeEventListener("message", onMessage);
    };
  }, [refresh]);

  // Service worker (notifications) et pastille sur l'icône de l'application.
  useEffect(() => {
    if ("serviceWorker" in navigator)
      navigator.serviceWorker
        .register("/admin/sw.js", { scope: "/admin/", updateViaCache: "none" })
        .catch(() => {});
  }, []);
  const waiting = orders.filter((o) => o.status === "Nouvelle").length;
  useEffect(() => {
    const nav = navigator as Navigator & {
      setAppBadge?: (n: number) => Promise<void>;
      clearAppBadge?: () => Promise<void>;
    };
    if (waiting) nav.setAppBadge?.(waiting).catch(() => {});
    else nav.clearAppBadge?.().catch(() => {});
  }, [waiting]);

  // Masque la barre d'onglets lorsque le clavier est ouvert (iPhone, Android).
  useEffect(() => {
    const root = document.documentElement;
    const isField = (el: Element | null) =>
      !!el &&
      (el.tagName === "TEXTAREA" ||
        el.tagName === "SELECT" ||
        (el.tagName === "INPUT" &&
          !["checkbox", "radio", "button", "submit", "file", "range"].includes(
            (el as HTMLInputElement).type,
          )));
    const update = () => {
      const vv = window.visualViewport;
      const keyboard = vv ? window.innerHeight - vv.height - vv.offsetTop : 0;
      root.style.setProperty("--kb", `${Math.max(0, keyboard)}px`);
      root.classList.toggle(
        "kb-open",
        isField(document.activeElement) && matchMedia("(pointer: coarse)").matches,
      );
    };
    const later = () => setTimeout(update, 50);
    document.addEventListener("focusin", update);
    document.addEventListener("focusout", later);
    window.visualViewport?.addEventListener("resize", update);
    window.visualViewport?.addEventListener("scroll", update);
    return () => {
      document.removeEventListener("focusin", update);
      document.removeEventListener("focusout", later);
      window.visualViewport?.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("scroll", update);
    };
  }, []);

  useEffect(() => {
    if (!banner) return;
    const timer = setTimeout(() => setBanner(null), 8000);
    return () => clearTimeout(timer);
  }, [banner]);

  const replace = useCallback((order: Order) => {
    setOrders((list) => list.map((o) => (o.id === order.id ? order : o)));
  }, []);
  const setStatus = useCallback(
    async (order: Order, status: OrderStatus, paidAmount?: number) => {
      const { order: next } = await api<{ order: Order }>(
        `/api/admin/orders/${order.id}`,
        "PATCH",
        { status, updatedAt: order.updatedAt, paidAmount },
      );
      replace(next);
      router.refresh();
      return next;
    },
    [replace, router],
  );

  const current = (href: string) => {
    const path = extra[pathname] || pathname;
    return href === "/admin" ? path === "/admin" : path.startsWith(href);
  };

  return (
    <Orders.Provider value={{ orders, refresh, replace, setStatus, offline }}>
      <div className="app">
        <a className="skip-link" href="#contenu">
          Aller au contenu
        </a>
        <nav className="tabbar" aria-label="Navigation de l’application">
          <div className="sidebar-brand">
            <img src={logo} alt="" width={40} height={40} />
            <span>
              <strong>Faubourg Pro</strong>
              <small>Boucherie du Faubourg</small>
            </span>
          </div>
          {tabs.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="tab"
              aria-current={current(href) ? "page" : undefined}
              onClick={() => haptic()}
            >
              <span className="tab-icon">
                <Icon size={25} strokeWidth={current(href) ? 2.3 : 1.8} />
                {href === "/admin/commandes" && waiting > 0 && (
                  <span className="tab-badge" aria-label={`${waiting} nouvelles`}>
                    {waiting}
                  </span>
                )}
              </span>
              <span className="tab-label">{label}</span>
            </Link>
          ))}
        </nav>
        <main id="contenu" className="screen">
          {offline && (
            <div className="offline" role="status">
              <WifiOff size={16} /> Hors connexion — les données affichées
              peuvent ne pas être à jour.
            </div>
          )}
          {children}
        </main>
        {banner && (
          <Link
            href={`/admin/commandes/${banner.id}`}
            className="order-banner"
            onClick={() => setBanner(null)}
            role="alert"
          >
            <BellRing size={22} />
            <span>
              <strong>Nouvelle commande {banner.id}</strong>
              <small>
                {banner.name} · {banner.items.length} produit
                {banner.items.length > 1 ? "s" : ""}
              </small>
            </span>
          </Link>
        )}
      </div>
    </Orders.Provider>
  );
}
