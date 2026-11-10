import type { Metadata } from "next";
import { getPublicPosts } from "@/lib/server/db";
import { PostCard } from "@/components/site/post-card";

export const metadata: Metadata = {
  title: "Actualités",
  description:
    "Arrivages, événements, horaires et nouvelles de la Boucherie du Faubourg à Amiens.",
  alternates: { canonical: "/actualites" },
};

export default async function Actualites() {
  const posts = await getPublicPosts();
  return (
    <div className="page">
      <header className="page-head">
        <span className="eyebrow">Au comptoir</span>
        <h1>Actualités</h1>
        <p>Arrivages, événements et informations pratiques de la boucherie.</p>
      </header>
      {posts.length ? (
        <div className="post-grid">
          {posts.map((p) => (
            <PostCard key={p.id} post={p} />
          ))}
        </div>
      ) : (
        <div className="empty">
          <h2>Pas encore d’actualité.</h2>
          <p>Les nouvelles de la boucherie apparaîtront ici.</p>
        </div>
      )}
    </div>
  );
}
