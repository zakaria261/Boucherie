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
  ChevronDown,
  ClipboardList,
  Menu,
  Minus,
  NotebookPen,
  Phone,
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
import { SocialLinks } from "./social-links";

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

type NavItem = { href: string; label: string; hint: string };
type NavGroup = { label: string; href?: string; items?: NavItem[]; highlight?: boolean };

/**
 * Navigation resserrée : quatre entrées, le reste regroupé dans des panneaux.
 * Toutes les pages restent accessibles en un clic depuis le menu.
 */
function navGroups(settings: Settings): NavGroup[] {
  return [
    {
      label: "La boutique",
      href: "/boutique",
      items: [
        { href: "/boutique", label: "Toute la boutique", hint: "Commandez en ligne, retirez en boutique" },
        { href: "/plateaux-a-partager", label: "Plateaux à partager", hint: "Fondue, pierrade et plancha, charcuterie" },
        { href: "/lots-et-marinades", label: "Lots et marinades", hint: "Colis pour la famille, marinades maison" },
        { href: "/barbecue", label: "Barbecue", hint: "Brochettes, saucisses et grillades" },
        { href: "/catalogue-des-fetes", label: "Catalogue des fêtes", hint: "Foies gras, volailles, pièces d’exception" },
        { href: "/liste-de-courses", label: "Ma liste de courses", hint: "Écrivez votre liste, nous préparons tout" },
      ],
    },
    { label: "Promotions", href: "/promotions", highlight: true },
    {
      label: "Conseils",
      items: [
        { href: "/recettes", label: "Recettes", hint: "Nos recettes, pas à pas" },
        { href: "/morceaux", label: "Guide des morceaux", hint: "Bœuf, agneau, veau : quel morceau choisir" },
        { href: "/que-cuisiner", label: "Que cuisiner ?", hint: "Une idée selon les convives et le budget" },
      ],
    },
    {
      label: "La boucherie",
      items: [
        { href: "/notre-maison", label: "Notre maison", hint: "Artisans bouchers à Amiens depuis 2018" },
        { href: "/actualites", label: "Actualités", hint: "Arrivages et nouveautés du comptoir" },
        { href: "/professionnels", label: "Professionnels", hint: "Restaurants, traiteurs : devis et commandes" },
        ...(settings.loyalty.enabled
          ? [{ href: "/fidelite", label: "Fidélité", hint: "Vos points et vos avantages" }]
          : []),
        { href: "/contact", label: "Contact et horaires", hint: "Adresse, téléphone, accès" },
      ],
    },
  ];
}

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
  const groups = navGroups(settings);
  // Liste de courses en cours (brouillon de la session), proposée avec le panier.
  const [listCount, setListCount] = useState(0);
  useEffect(() => {
    if (!open) return;
    try {
      const saved = JSON.parse(sessionStorage.getItem("faubourg-liste-brouillon") || "null");
      const items = Array.isArray(saved?.items) ? saved.items : [];
      setListCount(items.filter((i: { name?: string }) => String(i?.name || "").trim()).length);
    } catch {
      setListCount(0);
    }
  }, [open]);
  // Barre « Commander » sur téléphone : apparaît dès qu'on fait défiler.
  const [dock, setDock] = useState(false);
  useEffect(() => {
    const onScroll = () => setDock(window.scrollY > 160);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname]);
  const dockAllowed =
    !pathname.startsWith("/commande") &&
    !pathname.startsWith("/liste-de-courses") &&
    !/^\/boutique\/[^/]+/.test(pathname);
  const groupActive = (g: NavGroup) =>
    (g.href && active(g.href)) || !!g.items?.some((i) => active(i.href));
  const [panel, setPanel] = useState("");
  // Après un clic dans le menu, le panneau se referme même si la souris
  // reste dessus ; il se rouvrira au prochain survol.
  const [hush, setHush] = useState(false);
  const firstPath = useRef(pathname);
  useEffect(() => {
    setPanel("");
    if (pathname !== firstPath.current) setHush(true);
    firstPath.current = pathname;
  }, [pathname]);
  useEffect(() => {
    if (!panel) return;
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !(e.target as Element).closest?.(".nav-group"))
        setPanel("");
    };
    document.addEventListener("keydown", close);
    document.addEventListener("pointerdown", close);
    return () => {
      document.removeEventListener("keydown", close);
      document.removeEventListener("pointerdown", close);
    };
  }, [panel]);
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
          <nav
            aria-label="Navigation principale"
            className={`nav ${hush ? "hush" : ""}`}
            onMouseLeave={() => setHush(false)}
          >
            {groups.map((g) => {
              const id = `panneau-${g.label.replace(/\W+/g, "-").toLowerCase()}`;
              const current = groupActive(g) ? "page" : undefined;
              if (!g.items)
                return (
                  <Link key={g.label} href={g.href!} className={`nav-top ${g.highlight ? "highlight" : ""}`} aria-current={current}>
                    {g.label}
                  </Link>
                );
              return (
                <div key={g.label} className={`nav-group ${panel === g.label ? "open" : ""}`}>
                  {g.href ? (
                    <Link href={g.href} className="nav-top" aria-current={current}>
                      {g.label} <ChevronDown size={15} aria-hidden="true" />
                    </Link>
                  ) : (
                    <button
                      type="button"
                      className="nav-top"
                      aria-current={current}
                      aria-expanded={panel === g.label}
                      aria-controls={id}
                      onClick={() => setPanel(panel === g.label ? "" : g.label)}
                    >
                      {g.label} <ChevronDown size={15} aria-hidden="true" />
                    </button>
                  )}
                  <div className="nav-panel" id={id}>
                    <ul>
                      {g.items.map((i) => (
                        <li key={i.href}>
                          <Link href={i.href} aria-current={pathname === i.href ? "page" : undefined}>
                            <strong>{i.label}</strong>
                            <small>{i.hint}</small>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </nav>
          <div className="header-actions">
            <Link
              className="icon-btn"
              aria-label="Rechercher un produit"
              href="/boutique?recherche=1"
            >
              <Search size={20} />
            </Link>
            <Link
              className="icon-btn orders-link"
              aria-label="Mes commandes"
              title="Mes commandes"
              href="/mes-commandes"
            >
              <ClipboardList size={20} />
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
          <span className="cart-bar-text">
            <strong>Voir mon panier</strong>
            <small>Retrait en boutique</small>
          </span>
          <strong className="cart-bar-total">{money(total)}</strong>
          <ArrowRight size={18} aria-hidden="true" />
        </button>
      )}

      {ready && count === 0 && dockAllowed && (
        <nav className={`mobile-dock ${dock ? "show" : ""}`} aria-label="Commander" inert={!dock}>
          <Link className="dock-main" href="/boutique">
            <span className="dock-main-icon">
              <ShoppingBag size={20} aria-hidden="true" />
            </span>
            <span>
              <strong>Commander</strong>
              <small>Retrait en boutique</small>
            </span>
          </Link>
          <Link className="dock-btn" href="/liste-de-courses">
            <NotebookPen size={20} aria-hidden="true" />
            <small>Ma liste</small>
          </Link>
          {settings.phone && (
            <a className="dock-btn" href={`tel:${settings.phone.replace(/[^+\d]/g, "")}`}>
              <Phone size={20} aria-hidden="true" />
              <small>Appeler</small>
            </a>
          )}
        </nav>
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
          <div className="menu-quick">
            <Link href="/boutique" className="button primary">
              <ShoppingBag size={18} /> Commander
            </Link>
            <Link href="/mes-commandes" className="button outline">
              <ClipboardList size={18} /> Mes commandes
            </Link>
          </div>
          <Link className="menu-promo" href="/promotions" aria-current={active("/promotions") ? "page" : undefined}>
            Promotions <ArrowRight size={18} aria-hidden="true" />
          </Link>
          {groups
            .filter((g) => g.items)
            .map((g) => (
              <section key={g.label} className="menu-group" aria-label={g.label}>
                <h2>{g.label}</h2>
                {g.items!.map((i) => (
                  <Link key={i.href} href={i.href} aria-current={pathname === i.href ? "page" : undefined}>
                    {i.label}
                  </Link>
                ))}
              </section>
            ))}
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
              <Link className="cart-list-link" href="/liste-de-courses">
                <NotebookPen size={20} aria-hidden="true" />
                <span>
                  <strong>
                    {listCount
                      ? `Envoyer avec ma liste de courses (${listCount} article${listCount > 1 ? "s" : ""})`
                      : "Un produit absent de la boutique ?"}
                  </strong>
                  <small>
                    {listCount
                      ? "Panier et liste partent ensemble : une seule commande, un seul retrait."
                      : "Ajoutez une liste de courses : elle partira avec ce panier."}
                  </small>
                </span>
                <ArrowRight size={18} aria-hidden="true" />
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
          <SocialLinks links={settings.social} />
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
        {navGroups(settings)
          .filter((g) => g.items)
          .map((g) => (
            <div key={g.label}>
              <h3>{g.label}</h3>
              {g.label === "La boutique" && <Link href="/promotions">Promotions</Link>}
              {g.items!.map((i) => (
                <Link key={i.href} href={i.href}>
                  {i.label}
                </Link>
              ))}
              {g.label === "La boucherie" && <Link href="/mes-commandes">Mes commandes</Link>}
            </div>
          ))}
      </div>
      <div className="footer-bottom">
        <span>
          © {new Date().getFullYear()} {settings.name}
          {settings.legal.siren ? ` · SIREN ${settings.legal.siren}` : ""}
        </span>
        <span className="footer-legal">
          <Link href="/informations">Commandes et confidentialité</Link>
          <Link href="/mentions-legales">Mentions légales</Link>
          <Link href="/admin">Espace boucher</Link>
        </span>
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
