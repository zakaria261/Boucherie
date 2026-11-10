import type { Viewport } from "next";
import { Fraunces, DM_Sans } from "next/font/google";
import { StoreShell } from "@/components/site/store";
import { getPublicProducts, getSettings } from "@/lib/server/db";
import "./site.css";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const serif = Fraunces({
  subsets: ["latin"],
  variable: "--font-serif",
  axes: ["opsz"],
  display: "swap",
});
const sans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f3ec" },
    { media: "(prefers-color-scheme: dark)", color: "#191817" },
  ],
};

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`site ${serif.variable} ${sans.variable}`}>
      <StoreShell products={getPublicProducts()} settings={getSettings()}>
        {children}
      </StoreShell>
    </div>
  );
}
