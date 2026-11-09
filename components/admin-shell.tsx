"use client";
import { ThemeToggle } from "@/components/theme-toggle";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowUpRight,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Package,
  Settings2,
  ShoppingBag,
} from "lucide-react";
import type { Settings } from "@/lib/types";
export async function api(url: string, method: string, body?: unknown) {
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error("Le serveur est indisponible. Réessayez.");
  }
  if (!response.ok)
    throw new Error(result.error || "Impossible d’enregistrer.");
  return result;
}
export function AdminShell({
  children,
  email,
  settings,
}: {
  children: React.ReactNode;
  email: string;
  settings: Settings;
}) {
  const pathname = usePathname(),
    router = useRouter();
  const links = [
    { href: "/admin", label: "Vue d’ensemble", icon: LayoutDashboard },
    { href: "/admin/produits", label: "Produits", icon: Package },
    { href: "/admin/commandes", label: "Commandes", icon: ShoppingBag },
    { href: "/admin/boutique", label: "Ma boutique", icon: Settings2 },
  ];
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Link href="/admin" className="admin-brand">
          <img src={settings.logo} alt={settings.name} />
          <span>
            DU FAUBOURG<small>ESPACE PROPRIÉTAIRE</small>
          </span>
        </Link>
        <span className="admin-nav-label">VOTRE QUOTIDIEN</span>
        <nav aria-label="Administration">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={
                (
                  href === "/admin"
                    ? pathname === href
                    : pathname.startsWith(href)
                )
                  ? "current"
                  : ""
              }
            >
              <Icon size={19} />
              {label}
              {(href === "/admin"
                ? pathname === href
                : pathname.startsWith(href)) && <ChevronRight size={14} />}
            </Link>
          ))}
        </nav>
        <div className="admin-sidebar-bottom">
          <Link href="/" target="_blank">
            Voir ma boutique <ArrowUpRight size={16} />
          </Link>
          <div className="admin-user">
            <span>P</span>
            <div>
              <strong>Propriétaire</strong>
              <small>{email}</small>
            </div>
            <button
              title="Se déconnecter"
              aria-label="Se déconnecter"
              onClick={async () => {
                await api("/api/auth/logout", "POST");
                router.replace("/admin/connexion");
                router.refresh();
              }}
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>
      <div className="admin-workspace">
        <header className="admin-topbar">
          <ThemeToggle />
          <span>
            Ma boutique <ChevronRight size={13} />{" "}
            {links.find((x) =>
              x.href === "/admin"
                ? pathname === x.href
                : pathname.startsWith(x.href),
            )?.label || "Produits"}
          </span>
          <div>
            <span className="live-dot" /> Boutique connectée{" "}
            <Link href="/" target="_blank">
              <ArrowUpRight size={17} />
              <span>Voir le site</span>
            </Link>
          </div>
        </header>
        <main className="admin-main">{children}</main>
        <footer className="admin-footer">
          Boucherie du Faubourg <span>Votre savoir-faire. Votre boutique.</span>
        </footer>
      </div>
    </div>
  );
}
