import type { Viewport } from "next";
import { Archivo } from "next/font/google";
import { StoreShell } from "@/components/site/store";
import { getPublicProducts, getSettings } from "@/lib/server/db";
import "./site.css";

// Pages statiques servies par le CDN, régénérées à chaque modification du
// boucher ou commande (lib/server/refresh.ts) et au plus tard toutes les 60 s
// (promotions et actualités programmées).
export const revalidate = 60;
export const runtime = "nodejs";

// Une seule famille, la grotesque Archivo (graisse et chasse variables) :
// titres serrés et affirmés, texte courant très lisible.
const sans = Archivo({
  subsets: ["latin"],
  variable: "--font-sans",
  axes: ["wdth"],
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#111110" },
  ],
};

export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`site ${sans.variable}`}>
      <StoreShell
        products={await getPublicProducts()}
        settings={await getSettings()}
      >
        {children}
      </StoreShell>
    </div>
  );
}
