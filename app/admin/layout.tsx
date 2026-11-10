import type { Metadata, Viewport } from "next";
import "./app.css";

export const metadata: Metadata = {
  title: { default: "Faubourg Pro", template: "%s · Faubourg Pro" },
  robots: { index: false, follow: false },
  manifest: "/admin/manifest.webmanifest",
  applicationName: "Faubourg Pro",
  appleWebApp: { capable: true, title: "Faubourg Pro", statusBarStyle: "default" },
  icons: {
    icon: [{ url: "/app-icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/app-icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f2f7" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export const dynamic = "force-dynamic";

export default function AdminRoot({ children }: { children: React.ReactNode }) {
  return <div className="ios">{children}</div>;
}
