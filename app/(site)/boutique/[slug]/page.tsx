import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicProducts, getRecipes } from "@/lib/server/db";
import { ProductDetail } from "@/components/site/product-detail";
import { unitShort } from "@/lib/types";
import { money } from "@/lib/shop";
import { siteUrl } from "@/lib/site";

async function find(slug: string) {
  const id = decodeURIComponent(slug);
  return (await getPublicProducts()).find((p) => p.id === id);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const product = await find((await params).slug);
  if (!product) return { title: "Produit introuvable" };
  return {
    title: `${product.name} · ${product.category}`,
    description: `${product.name} à ${money(product.promo?.price ?? product.price)} ${unitShort[product.unit]} chez votre artisan boucher à Amiens. Commandez en ligne, retirez en boutique.`,
    alternates: { canonical: `/boutique/${encodeURIComponent(product.id)}` },
    openGraph: { images: [product.image] },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const product = await find((await params).slug);
  if (!product) notFound();
  const recipes = (await getRecipes()).filter(
    (r) =>
      r.productIds.includes(product.id) ||
      r.ingredients.some((i) => i.productId === product.id),
  );
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: `${siteUrl}${product.image}`,
    category: product.category,
    description: product.description || undefined,
    offers: {
      "@type": "Offer",
      priceCurrency: "EUR",
      price: ((product.promo?.price ?? product.price) / 100).toFixed(2),
      availability: product.available
        ? "https://schema.org/InStoreOnly"
        : "https://schema.org/OutOfStock",
    },
  };
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ProductDetail product={product} recipes={recipes} />
    </>
  );
}
