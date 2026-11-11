import Link from "next/link";
import type { Post } from "@/lib/types";
import { Photo } from "./photo";

export const postDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Paris",
  });

export function PostCard({ post }: { post: Post }) {
  return (
    <Link className="post-card" href={`/actualites/${post.id}`}>
      <Photo src={post.image} sizes="(max-width: 640px) 100vw, (max-width: 1100px) 50vw, 400px" />
      <span className="post-card-body">
        <span className="post-meta">
          <span className="tag soft">{post.type}</span>
          <time dateTime={post.publishAt}>{postDate(post.publishAt)}</time>
        </span>
        <strong>{post.title}</strong>
        {post.body && <small>{post.body.slice(0, 140)}{post.body.length > 140 ? "…" : ""}</small>}
      </span>
    </Link>
  );
}
