import type { MetadataRoute } from "next";
import { getPublicPosts, getProducts, getRecipes } from "@/lib/server/db";
import { siteUrl } from "@/lib/site";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = [
    ["", 1],
    ["/boutique", 0.9],
    ["/promotions", 0.8],
    ["/barbecue", 0.7],
    ["/recettes", 0.6],
    ["/morceaux", 0.5],
    ["/que-cuisiner", 0.5],
    ["/actualites", 0.6],
    ["/notre-maison", 0.6],
    ["/contact", 0.8],
    ["/informations", 0.2],
    ["/mentions-legales", 0.2],
  ] as const;
  return [
    ...pages.map(([path, priority]) => ({
      url: `${siteUrl}${path}`,
      priority,
    })),
    ...(await getProducts()).map((p) => ({
      url: `${siteUrl}/boutique/${encodeURIComponent(p.id)}`,
      priority: 0.7,
    })),
    ...(await getRecipes()).map((r) => ({
      url: `${siteUrl}/recettes/${r.id}`,
      priority: 0.5,
    })),
    ...(await getPublicPosts()).map((p) => ({
      url: `${siteUrl}/actualites/${p.id}`,
      lastModified: p.updatedAt,
      priority: 0.4,
    })),
  ];
}
