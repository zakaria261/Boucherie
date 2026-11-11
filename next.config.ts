import type { NextConfig } from "next";

const config: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR || ".next",
  images: {
    // Photos servies en AVIF/WebP à la taille de l'écran.
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 2678400,
    remotePatterns: [
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com", pathname: "/photos/**" },
    ],
  },
  serverExternalPackages: ["sharp", "web-push", "pg", "@electric-sql/pglite"],
  // Anciennes adresses du site Wix (sitemap de www.boucheriedufaubourg-amiens.com)
  // redirigées de façon permanente pour conserver le référencement acquis.
  async redirects() {
    return [
      { source: "/boutique-en-ligne", destination: "/boutique", permanent: true },
      { source: "/boutique-en-ligne/:path*", destination: "/boutique", permanent: true },
      { source: "/product-page/:slug", destination: "/boutique", permanent: true },
      { source: "/category/:slug", destination: "/boutique", permanent: true },
      { source: "/shop", destination: "/boutique", permanent: true },
      { source: "/mentions-l%C3%A9gales", destination: "/mentions-legales", permanent: true },
      { source: "/mentions-légales", destination: "/mentions-legales", permanent: true },
      {
        source: "/politique-en-mati%C3%A8re-de-cookies",
        destination: "/informations",
        permanent: true,
      },
      {
        source: "/politique-en-matière-de-cookies",
        destination: "/informations",
        permanent: true,
      },
      { source: "/forum", destination: "/actualites", permanent: true },
      { source: "/forum/:path*", destination: "/actualites", permanent: true },
      { source: "/membres", destination: "/", permanent: true },
      { source: "/blog", destination: "/actualites", permanent: true },
      { source: "/post/:slug", destination: "/actualites", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "geolocation=(), microphone=(), payment=()",
          },
        ],
      },
      {
        source: "/commande/suivi/:path*",
        headers: [
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "Cache-Control", value: "private, no-store" },
        ],
      },
      {
        source: "/admin/:path*",
        headers: [{ key: "Cache-Control", value: "private, no-store" }],
      },
      {
        source: "/admin",
        headers: [{ key: "Cache-Control", value: "private, no-store" }],
      },
      {
        source: "/api/:path*",
        headers: [{ key: "Cache-Control", value: "private, no-store" }],
      },
    ];
  },
};

export default config;
