import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getPost, getPublicProducts, postLive } from "@/lib/server/db";
import { ProductCard } from "@/components/site/product-card";
import { postDate } from "@/components/site/post-card";
import { Photo } from "@/components/site/photo";

// Générée à la première visite puis servie depuis le cache (ISR).
export async function generateStaticParams() {
  return [];
}

async function load(id: string) {
  const post = await getPost(decodeURIComponent(id));
  return post && postLive(post) ? post : undefined;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const post = await load((await params).id);
  if (!post) return { title: "Actualité introuvable" };
  return {
    title: post.title,
    description: post.body.slice(0, 160),
    alternates: { canonical: `/actualites/${post.id}` },
    openGraph: post.image ? { images: [post.image] } : undefined,
  };
}

export default async function Actualite({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const post = await load((await params).id);
  if (!post) notFound();
  const products = (await getPublicProducts()).filter((p) =>
    post.productIds.includes(p.id),
  );
  return (
    <article className="page narrow article">
      <Link className="back-link" href="/actualites">
        <ChevronLeft size={16} /> Actualités
      </Link>
      <span className="eyebrow">
        {post.type} ·{" "}
        <time dateTime={post.publishAt}>{postDate(post.publishAt)}</time>
      </span>
      <h1>{post.title}</h1>
      <Photo className="article-image" src={post.image} sizes="(max-width: 860px) 100vw, 860px" preload />
      {post.body.split(/\n{2,}/).map((para, i) => (
        <p key={i} className="pre">
          {para}
        </p>
      ))}
      {products.length > 0 && (
        <section className="block">
          <h2>Les produits</h2>
          <div className="product-grid">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
