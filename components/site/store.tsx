"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ArrowRight,
  Check,
  Menu,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  X,
} from "lucide-react";
import type { PublicProduct, Settings } from "@/lib/types";
import {
  cartKey,
  linePrice,
  MAX_QUANTITY,
  money,
  portionLabel,
  restoreCart,
  weightsFor,
  type CartItem,
} from "@/lib/shop";
import { ThemeToggle } from "@/components/theme-toggle";
import { scheduleLines } from "@/lib/pickup";
import { Photo } from "./photo";

export const effectivePrice = (p: PublicProduct) => p.promo?.price ?? p.price;

/** Une ligne d'ancienne commande peut-elle être remise au panier telle quelle ? */
export function reorderable(
  products: PublicProduct[],
  item: { id: string; grams: number; options: string[] },
) {
  const p = products.find((x) => x.id === item.id);
  if (!p?.available || !weightsFor(p).includes(item.grams)) return false;
  const allowed = new Set(
    p.preparations.flatMap((o) =>
      o.choices.length ? o.choices.map((c) => `${o.name} : ${c}`) : [o.name],
    ),
  );
  return item.options.every((o) => allowed.has(o));
}

type Shop = {
  products: PublicProduct[];
  settings: Settings;
  cart: CartItem[];
  count: number;
  total: number;
  add: (
    p: PublicProduct,
    grams: number,
    quantity?: number,
    options?: string[],
  ) => void;
  update: (item: CartItem, delta: number) => void;
  remove: (item: CartItem) => void;
  clear: () => void;
  openCart: () => void;
};
const StoreContext = createContext<Shop | null>(null);
export function useShop() {
  const value = useContext(StoreContext);
  if (!value) throw new Error("Store unavailable");
  return value;
}

const CART_KEY = "faubourg-cart";

export function Brand({ settings }: { settings: Settings }) {
  return (
    <Link className="brand" href="/" aria-label={`${settings.name}, accueil`}>
      <Photo src={settings.logo} sizes="52px" preload />
      <span>
        <strong>Boucherie du Faubourg</strong>
        <small>Artisan boucher · Amiens</small>
      </span>
    </Link>
  );
}

const links: [string, string][] = [
  ["/boutique", "La boutique"],
  ["/promotions", "Promotions"],
  ["/barbecue", "Barbecue"],
  ["/recettes", "Recettes"],
  ["/notre-maison", "Notre maison"],
  ["/contact", "Contact"],
];

export function StoreShell({
  products,
  settings,
  children,
}: {
  products: PublicProduct[];
  settings: Settings;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [cart, setCart] = useState<CartItem[]>([]),
    [ready, setReady] = useState(false),
    [open, setOpen] = useState(false),
    [menu, setMenu] = useState(false),
    [toast, setToast] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const menuDialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    try {
      setCart(
        restoreCart(JSON.parse(localStorage.getItem(CART_KEY) || "[]"), products),
      );
    } catch {}
    setReady(true);
    // Le panier se synchronise entre les onglets ouverts.
    const sync = (event: StorageEvent) => {
      if (event.key !== CART_KEY) return;
      try {
        setCart(restoreCart(JSON.parse(event.newValue || "[]"), products));
      } catch {}
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
    // products ne change qu'au rechargement de la page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (ready)
      try {
        localStorage.setItem(CART_KEY, JSON.stringify(cart));
      } catch {}
  }, [cart, ready]);
  useEffect(() => {
    setMenu(false);
    setOpen(false);
  }, [pathname]);
  useEffect(() => {
    if (open) dialog.current?.showModal();
    else dialog.current?.close();
  }, [open]);
  useEffect(() => {
    if (menu) menuDialog.current?.showModal();
    else menuDialog.current?.close();
  }, [menu]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const activeCart = cart.filter((i) => products.some((p) => p.id === i.id));
  const count = activeCart.reduce((sum, i) => sum + i.quantity, 0);
  const total = activeCart.reduce((sum, i) => {
    const p = products.find((p) => p.id === i.id)!;
    return sum + linePrice(effectivePrice(p), i.grams, i.quantity, p.unit);
  }, 0);

  const add = useCallback(
    (p: PublicProduct, grams: number, quantity = 1, options: string[] = []) => {
      if (!p.available) return;
      const item = { id: p.id, grams, quantity, options };
      setCart((current) => {
        const found = current.find((i) => cartKey(i) === cartKey(item));
        return found
          ? current.map((i) =>
              i === found
                ? { ...i, quantity: Math.min(MAX_QUANTITY, i.quantity + quantity) }
                : i,
            )
          : [...current, item];
      });
      setToast(`${p.name} ajouté au panier`);
    },
    [],
  );
  function update(item: CartItem, delta: number) {
    setCart((current) =>
      current
        .map((i) =>
          cartKey(i) === cartKey(item)
            ? { ...i, quantity: Math.min(MAX_QUANTITY, i.quantity + delta) }
            : i,
        )
        .filter((i) => i.quantity > 0),
    );
  }
  const remove = (item: CartItem) =>
    setCart((current) => current.filter((i) => cartKey(i) !== cartKey(item)));
  const active = (href: string) => pathname.startsWith(href);
  const hideBar = pathname.startsWith("/commande");

  return (
    <StoreContext.Provider
      value={{
        products,
        settings,
        cart: activeCart,
        count,
        total,
        add,
        update,
        remove,
        clear: () => setCart([]),
        openCart: () => setOpen(true),
      }}
    >
      <a className="skip" href="#main">
        Passer au contenu
      </a>
      {settings.announcement && (
        <div className="announcement">{settings.announcement}</div>
      )}
      <header className="header">
        <div className="header-inner">
          <Brand settings={settings} />
          <nav aria-label="Navigation principale" className="nav">
            {links.map(([href, label]) => (
              <Link
                key={href}
                href={href}
                aria-current={active(href) ? "page" : undefined}
              >
                {label}
              </Link>
            ))}
          </nav>
          <div className="header-actions">
            <Link
              className="icon-btn"
              aria-label="Rechercher un produit"
              href="/boutique?recherche=1"
            >
              <Search size={20} />
            </Link>
            <ThemeToggle />
            <button
              className="cart-button"
              onClick={() => setOpen(true)}
              aria-label={`Mon panier, ${count} article${count > 1 ? "s" : ""}`}
            >
              <ShoppingBag size={20} />
              <span className="cart-button-label">Mon panier</span>
              {count > 0 && <b>{count}</b>}
            </button>
            <button
              className="icon-btn menu-toggle"
              aria-label="Ouvrir le menu"
              aria-expanded={menu}
              onClick={() => setMenu(true)}
            >
              <Menu size={22} />
            </button>
          </div>
        </div>
      </header>
      <main id="main">{children}</main>
      <Footer settings={settings} />

      {count > 0 && !hideBar && !open && (
        <button className="cart-bar" onClick={() => setOpen(true)}>
          <span className="cart-bar-count">{count}</span>
          <span>Voir mon panier</span>
          <strong>{money(total)}</strong>
        </button>
      )}

      <div className={`toast ${toast ? "visible" : ""}`} role="status">
        <Check size={17} />
        {toast}
      </div>

      <dialog
        ref={menuDialog}
        className="menu-sheet"
        aria-label="Menu"
        onClose={() => setMenu(false)}
        onClick={(e) => {
          if (e.target === e.currentTarget) setMenu(false);
        }}
      >
        <div className="menu-sheet-head">
          <Brand settings={settings} />
          <button
            className="icon-btn"
            aria-label="Fermer le menu"
            onClick={() => setMenu(false)}
          >
            <X size={22} />
          </button>
        </div>
        <nav aria-label="Menu principal" className="menu-links">
          <Link href="/" aria-current={pathname === "/" ? "page" : undefined}>
            Accueil
          </Link>
          {links.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              aria-current={active(href) ? "page" : undefined}
            >
              {label}
            </Link>
          ))}
          <Link href="/actualites">Actualités</Link>
          <Link href="/morceaux">Les morceaux</Link>
          <Link href="/mes-commandes">Mes commandes</Link>
        </nav>
        <div className="menu-sheet-foot">
          <ThemeToggle />
          <p>{settings.address}</p>
          {settings.phone && (
            <a href={`tel:${settings.phone.replace(/[^+\d]/g, "")}`}>
              {settings.phone}
            </a>
          )}
        </div>
      </dialog>

      <dialog
        ref={dialog}
        className="cart-sheet"
        aria-label="Mon panier"
        onClose={() => setOpen(false)}
        onClick={(e) => {
          if (e.target === e.currentTarget) setOpen(false);
        }}
      >
        <div className="cart-head">
          <h2>
            Mon panier <span>({count})</span>
          </h2>
          <button
            className="icon-btn"
            aria-label="Fermer le panier"
            onClick={() => setOpen(false)}
          >
            <X size={22} />
          </button>
        </div>
        {!count ? (
          <div className="empty">
            <ShoppingBag size={36} />
            <h3>Votre panier est vide.</h3>
            <p>Choisissez vos morceaux, nous les préparons pour votre passage.</p>
            <Link className="button primary" href="/boutique">
              Voir la boutique <ArrowRight size={18} />
            </Link>
          </div>
        ) : (
          <>
            <CartLines />
            <div className="cart-summary">
              <div className="cart-total">
                <span>Total estimé</span>
                <strong>{money(total)}</strong>
              </div>
              <p>
                Le prix final dépend du poids préparé. Vous réglez en boutique,
                au retrait.
              </p>
              <Link className="button primary full" href="/commande">
                Choisir mon retrait <ArrowRight size={18} />
              </Link>
              <button className="text-button" onClick={() => setOpen(false)}>
                Continuer mes achats
              </button>
            </div>
          </>
        )}
      </dialog>
    </StoreContext.Provider>
  );
}

function Footer({ settings }: { settings: Settings }) {
  const hours = scheduleLines(settings.pickup);
  return (
    <footer className="footer">
      <div className="footer-grid">
        <div className="footer-brand">
          <Brand settings={settings} />
          <p>{settings.address}</p>
          {settings.phone && (
            <a href={`tel:${settings.phone.replace(/[^+\d]/g, "")}`}>
              {settings.phone}
            </a>
          )}
          <a href={`mailto:${settings.email}`}>{settings.email}</a>
        </div>
        <div>
          <h3>Horaires</h3>
          <dl className="hours-list">
            {hours.map((h) => (
              <div key={h.day}>
                <dt>{h.name}</dt>
                <dd>{h.text}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div>
          <h3>La boutique</h3>
          <Link href="/boutique">Toute la boutique</Link>
          <Link href="/promotions">Promotions</Link>
          <Link href="/barbecue">Barbecue</Link>
          <Link href="/recettes">Recettes</Link>
          <Link href="/morceaux">Les morceaux</Link>
          <Link href="/que-cuisiner">Que cuisiner ?</Link>
        </div>
        <div>
          <h3>La maison</h3>
          <Link href="/notre-maison">Notre histoire</Link>
          <Link href="/actualites">Actualités</Link>
          <Link href="/contact">Contact et accès</Link>
          <Link href="/mes-commandes">Mes commandes</Link>
          <Link href="/informations">Confidentialité</Link>
          <Link href="/mentions-legales">Mentions légales</Link>
        </div>
      </div>
      <div className="footer-bottom">
        <span>
          © {new Date().getFullYear()} {settings.name}
          {settings.legal.siren ? ` · SIREN ${settings.legal.siren}` : ""}
        </span>
        <Link href="/admin">Espace boucher</Link>
      </div>
    </footer>
  );
}

export function CartLines() {
  const { cart, products, update, remove } = useShop();
  return (
    <ul className="cart-lines">
      {cart.map((item) => {
        const p = products.find((p) => p.id === item.id)!;
        const price = effectivePrice(p);
        return (
          <li className="cart-line" key={cartKey(item)}>
            <Photo src={p.image} sizes="72px" />
            <div className="cart-line-body">
              <h3>{p.name}</h3>
              <small>
                {portionLabel(p.unit, item.grams)}
                {item.options.length ? ` · ${item.options.join(" · ")}` : ""}
              </small>
              {!p.available && <small className="warn">Indisponible</small>}
              <div className="stepper small">
                <button
                  type="button"
                  aria-label={
                    item.quantity === 1
                      ? `Retirer ${p.name}`
                      : `Diminuer ${p.name}`
                  }
                  onClick={() =>
                    item.quantity === 1 ? remove(item) : update(item, -1)
                  }
                >
                  <Minus size={15} />
                </button>
                <span aria-live="polite">{item.quantity}</span>
                <button
                  type="button"
                  aria-label={`Augmenter ${p.name}`}
                  onClick={() => update(item, 1)}
                  disabled={item.quantity >= MAX_QUANTITY}
                >
                  <Plus size={15} />
                </button>
              </div>
            </div>
            <strong>
              {money(linePrice(price, item.grams, item.quantity, p.unit))}
            </strong>
          </li>
        );
      })}
    </ul>
  );
}
