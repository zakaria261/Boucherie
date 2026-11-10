import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/server/security";
import { getPost, getProducts } from "@/lib/server/db";
import { PostEditor } from "@/components/admin/post-editor";
import { postTypes, type PostType } from "@/lib/types";

export const metadata = { title: "Publication" };

export default async function PostPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireAdminPage();
  const { id } = await params;
  const { type } = await searchParams;
  const products = await getProducts(true);
  if (id === "nouvelle")
    return (
      <PostEditor
        products={products}
        type={
          (postTypes as readonly string[]).includes(type || "")
            ? (type as PostType)
            : undefined
        }
      />
    );
  const post = await getPost(id);
  if (!post) notFound();
  return <PostEditor key={post.id} initial={post} products={products} />;
}
