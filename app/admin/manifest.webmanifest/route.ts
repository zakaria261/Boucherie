/**
 * Manifeste de l'application du boucher. Périmètre limité à /admin/ :
 * l'icône ouvre toujours l'espace de gestion, jamais le site public.
 */
export function GET() {
  return Response.json(
    {
      id: "/admin/",
      name: "Faubourg Pro",
      short_name: "Faubourg Pro",
      description: "Commandes, produits et publications de la Boucherie du Faubourg.",
      lang: "fr",
      start_url: "/admin",
      scope: "/admin/",
      display: "standalone",
      orientation: "portrait",
      background_color: "#f2f2f7",
      theme_color: "#7a1f2b",
      icons: [
        { src: "/app-icons/icon-192.png", sizes: "192x192", type: "image/png" },
        { src: "/app-icons/icon-512.png", sizes: "512x512", type: "image/png" },
        {
          src: "/app-icons/icon-maskable-512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "maskable",
        },
      ],
      shortcuts: [
        { name: "Commandes", url: "/admin/commandes" },
        { name: "Nouvelle publication", url: "/admin/publications" },
      ],
    },
    {
      headers: {
        "Content-Type": "application/manifest+json",
        "Cache-Control": "public, max-age=3600",
      },
    },
  );
}
