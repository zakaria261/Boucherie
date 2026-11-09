"use client";
import { ThemeToggle } from "@/components/theme-toggle";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  MapPin,
  Menu,
  MessageCircle,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  Store,
  X,
} from "lucide-react";
import type { Product, Settings } from "@/lib/types";
import { type CartItem, linePrice, money, restoreCart } from "@/lib/shop";
import { whatsappLink } from "@/lib/whatsapp";

type Shop = {
  products: Product[];
  settings: Settings;
  cart: CartItem[];
  add: (p: Product, grams?: number) => void;
  update: (index: number, delta: number) => void;
  clear: () => void;
  openCart: () => void;
};
const StoreContext = createContext<Shop | null>(null);
export function useShop() {
  const value = useContext(StoreContext);
  if (!value) throw new Error("Store unavailable");
  return value;
}
export function Brand({ settings }: { settings: Settings }) {
  return (
    <Link
      className="brand real-brand"
      href="/"
      aria-label={`${settings.name}, accueil`}
    >
      <img
        src={settings.logo}
        alt={`Logo ${settings.name}`}
        width={72}
        height={72}
      />
      <span>
        <small>BOUCHERIE</small>
        <strong>DU FAUBOURG</strong>
        <span className="brand-location">ARTISAN BOUCHER · AMIENS</span>
      </span>
    </Link>
  );
}
export function StoreShell({
  products,
  settings,
  children,
}: {
  products: Product[];
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
  useEffect(() => {
    try {
      setCart(
        restoreCart(
          JSON.parse(localStorage.getItem("faubourg-cart") || "[]"),
          products,
        ),
      );
    } catch {}
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready)
      try {
        localStorage.setItem("faubourg-cart", JSON.stringify(cart));
      } catch {}
  }, [cart, ready]);
  useEffect(() => {
    setMenu(false);
    setOpen(false);
  }, [pathname]);
  useEffect(() => {
    if (open) dialog.current?.showModal();
    else dialog.current?.close();
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(timer);
  }, [toast]);
  const activeCart = cart.filter((i) => products.some((p) => p.id === i.id));
  const count = activeCart.reduce((sum, i) => sum + i.quantity, 0);
  const total = activeCart.reduce(
    (sum, i) =>
      sum +
      linePrice(
        products.find((p) => p.id === i.id)!.price,
        i.grams,
        i.quantity,
      ),
    0,
  );
  function add(p: Product, grams = 500) {
    if (!p.available) return;
    setCart((current) => {
      const found = current.find((i) => i.id === p.id && i.grams === grams);
      return found
        ? current.map((i) =>
            i === found ? { ...i, quantity: Math.min(20, i.quantity + 1) } : i,
          )
        : [...current, { id: p.id, grams, quantity: 1 }];
    });
    setToast(`${p.name} ajouté au panier`);
  }
  function update(index: number, delta: number) {
    const item = activeCart[index];
    setCart((current) =>
      current
        .map((i) =>
          i.id === item.id && i.grams === item.grams
            ? { ...i, quantity: Math.min(20, i.quantity + delta) }
            : i,
        )
        .filter((i) => i.quantity > 0),
    );
  }
  const links = [
    ["/", "Accueil"],
    ["/boutique", "La boutique"],
    ["/barbecue", "Barbecue"],
    ["/notre-maison", "Notre maison"],
    ["/contact", "Contact"],
  ];
  const shopWhatsapp = whatsappLink(
    settings.whatsapp,
    "Bonjour, j’ai une question pour la Boucherie du Faubourg.",
  );
  return (
    <StoreContext.Provider
      value={{
        products,
        settings,
        cart: activeCart,
        add,
        update,
        clear: () => setCart([]),
        openCart: () => setOpen(true),
      }}
    >
      <a className="skip" href="#main">
        Passer au contenu
      </a>
      <div className="announcement">
        <span>LE GOÛT DU SAVOIR-FAIRE, DEPUIS 2018</span>
        <span>
          <Store size={14} />
          {settings.announcement}
          <ArrowRight size={14} />
        </span>
        <Link href="/contact">
          Votre artisan à Amiens <MapPin size={13} />
        </Link>
      </div>
      <header className="header">
        <div className="header-inner">
          <Brand settings={settings} />
          <nav
            aria-label="Navigation principale"
            className={`nav ${menu ? "is-open" : ""}`}
          >
            {links.map(([href, label]) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMenu(false)}
                className={
                  (href === "/" ? pathname === "/" : pathname.startsWith(href))
                    ? "active"
                    : ""
                }
                aria-current={
                  (href === "/" ? pathname === "/" : pathname.startsWith(href))
                    ? "page"
                    : undefined
                }
              >
                {label}
              </Link>
            ))}
          </nav>
          <div className="header-actions">
            <ThemeToggle />
            <Link
              className="icon-btn"
              aria-label="Rechercher un produit"
              href="/boutique?recherche=1"
            >
              <Search size={21} />
            </Link>
            <span className="header-divider" />
            <button className="cart-trigger" onClick={() => setOpen(true)}>
              <ShoppingBag size={20} />
              <span>Mon panier</span>
              <b>{count}</b>
            </button>
            <button
              className="icon-btn menu-toggle"
              aria-label="Ouvrir le menu"
              aria-expanded={menu}
              onClick={() => setMenu(!menu)}
            >
              {menu ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </header>
      <main id="main">{children}</main>
      <footer className="site-footer">
        <div className="footer-columns">
          <div>
            <Brand settings={settings} />
            <p>
              De la passion. Du savoir-faire.
              <br />
              Et le plaisir de bien manger.
            </p>
          </div>
          <div>
            <h3>Le comptoir</h3>
            <Link href="/boutique">Toutes nos viandes</Link>
            <Link href="/barbecue">La sélection barbecue</Link>
            <Link href="/commande">Mon panier & retrait</Link>
          </div>
          <div>
            <h3>La maison</h3>
            <Link href="/notre-maison">Notre histoire</Link>
            <Link href="/contact">Nous rendre visite</Link>
            <Link href="/informations">Informations & confidentialité</Link>
          </div>
          <div>
            <h3>Retrouvons-nous</h3>
            <p>{settings.address}</p>
            <a href={`mailto:${settings.email}`}>{settings.email}</a>
            {settings.phone && (
              <a href={`tel:${settings.phone.replace(/[^+\d]/g, "")}`}>
                {settings.phone}
              </a>
            )}
            {shopWhatsapp && (
              <a href={shopWhatsapp} target="_blank" rel="noreferrer">
                <MessageCircle size={14} /> Écrire sur WhatsApp
              </a>
            )}
            <span>Artisan boucher depuis 2018</span>
          </div>
        </div>
        <div className="footer-bottom">
          <span>
            © {new Date().getFullYear()} {settings.name} · SIREN 751 872 524
          </span>
          <Link href="/admin">
            Espace propriétaire <ArrowUpRight size={12} />
          </Link>
        </div>
      </footer>
      <div className={`toast ${toast ? "visible" : ""}`} role="status">
        <Check size={18} />
        {toast}
      </div>
      <dialog
        ref={dialog}
        className="cart-dialog"
        aria-label="Mon panier"
        onCancel={() => setOpen(false)}
        onClick={(e) => {
          if (e.target === e.currentTarget) setOpen(false);
        }}
      >
        <div className="cart-heading">
          <div className="eyebrow">VOTRE SÉLECTION GOURMANDE</div>
          <div>
            <h2>
              Mon panier <span>({count})</span>
            </h2>
            <button
              className="icon-btn"
              aria-label="Fermer le panier"
              onClick={() => setOpen(false)}
            >
              <X />
            </button>
          </div>
        </div>
        {!count ? (
          <div className="empty">
            <ShoppingBag size={44} />
            <h3>De bonnes choses vous attendent.</h3>
            <p>Faites votre marché, votre artisan s’occupe du reste.</p>
            <Link
              className="button primary"
              href="/boutique"
              onClick={() => setOpen(false)}
            >
              Découvrir la boutique <ArrowRight size={18} />
            </Link>
          </div>
        ) : (
          <>
            <CartLines />
            <div className="cart-summary">
              <div>
                <span>Total estimé</span>
                <strong>{money(total)}</strong>
              </div>
              <p>
                Le montant final dépend du poids préparé. Retrait après
                confirmation de votre boucher.
              </p>
              <Link
                className="button primary full"
                href="/commande"
                onClick={() => setOpen(false)}
              >
                Commander sur WhatsApp <MessageCircle size={17} />
              </Link>
              <button className="continue-link" onClick={() => setOpen(false)}>
                Continuer mon marché
              </button>
              <div className="pickup-note">
                <Store size={18} />
                {settings.address}
              </div>
            </div>
          </>
        )}
      </dialog>
    </StoreContext.Provider>
  );
}
export function CartLines() {
  const { cart, products, update } = useShop();
  return (
    <div className="cart-items">
      {cart.map((item, index) => {
        const p = products.find((p) => p.id === item.id)!;
        return (
          <div className="cart-item" key={`${item.id}-${item.grams}`}>
            <img src={p.image} alt={p.name} />
            <div>
              <h3>{p.name}</h3>
              <small>
                {item.grams} g · {money(p.price)}/kg
                {!p.available ? " · Indisponible" : ""}
              </small>
              <div className="quantity">
                <button
                  aria-label={`Diminuer ${p.name}`}
                  onClick={() => update(index, -1)}
                >
                  <Minus size={13} />
                </button>
                <span>{item.quantity}</span>
                <button
                  aria-label={`Augmenter ${p.name}`}
                  onClick={() => update(index, 1)}
                  disabled={item.quantity >= 20}
                >
                  <Plus size={13} />
                </button>
              </div>
            </div>
            <strong>
              {money(linePrice(p.price, item.grams, item.quantity))}
            </strong>
          </div>
        );
      })}
    </div>
  );
}
export function ProductCard({ product: p }: { product: Product }) {
  const { add } = useShop();
  return (
    <article className="product">
      <Link
        href={`/boutique/${encodeURIComponent(p.id)}`}
        className="product-image"
        aria-label={`Voir ${p.name}`}
      >
        <img src={p.image} alt={p.name} loading="lazy" />
        {(p.badge || !p.available) && (
          <span className={`product-tag ${p.featured ? "red" : ""}`}>
            {p.available ? p.badge : "Momentanément indisponible"}
          </span>
        )}
        <span className="quick-view">
          Découvrir ce produit <ArrowUpRight size={16} />
        </span>
      </Link>
      <div className="product-info">
        <span className="product-category">
          {p.category} <span>•</span>{" "}
          {p.grill ? "À partager" : "Sélection du boucher"}
        </span>
        <Link
          className="product-title"
          href={`/boutique/${encodeURIComponent(p.id)}`}
        >
          {p.name}
        </Link>
        <div className="product-bottom">
          <span>
            <strong>{money(p.price)}</strong>
            <small> / kg</small>
            <span className="portion">
              Soit {money(linePrice(p.price, 500))} les 500 g
            </span>
          </span>
          <button
            className="add-button"
            disabled={!p.available}
            aria-label={`Ajouter 500 g de ${p.name}`}
            onClick={() => add(p)}
          >
            <Plus size={20} />
          </button>
        </div>
      </div>
    </article>
  );
}
