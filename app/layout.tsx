import type { Metadata, Viewport } from "next";
import "./base.css";
import { themeScript } from "@/lib/theme";
import { siteUrl } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Boucherie du Faubourg | Artisan boucher à Amiens",
    template: "%s | Boucherie du Faubourg",
  },
  description:
    "Artisan boucher au 6 rue d’Abbeville à Amiens : bœuf, veau, agneau, volailles et préparations maison. Commandez en ligne et retirez en boutique.",
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: "Boucherie du Faubourg",
    images: ["/images/hero.jpg"],
  },
  icons: { icon: "/images/logo-original.png" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
