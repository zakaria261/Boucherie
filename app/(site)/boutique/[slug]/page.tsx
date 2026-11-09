import { notFound } from "next/navigation";
import { getProduct } from "@/lib/server/db";
import { ProductDetail } from "@/components/product-detail";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const product = getProduct(decodeURIComponent((await params).slug));
  return {
    title: product?.published
      ? `${product.name} | Boucherie du Faubourg`
      : "Produit introuvable",
  };
}
export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const product = getProduct(decodeURIComponent((await params).slug));
  if (!product?.published) notFound();
  return <ProductDetail product={product} />;
}
