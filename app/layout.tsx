import type { Metadata } from "next";
import "./globals.css";
import "./whatsapp.css";
import { themeScript } from "@/lib/theme";
export const metadata: Metadata = {
  title: "Boucherie du Faubourg | Artisan boucher à Amiens",
  description:
    "Le goût du bon, le savoir-faire en plus. Découvrez nos viandes et préparations artisanales au 6 rue d’Abbeville à Amiens. Préparez votre commande en ligne.",
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
