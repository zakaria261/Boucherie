import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/server/security";
import { getCutGuide } from "@/lib/server/cut-guide";
import { getProducts } from "@/lib/server/db";
import { CutEditor } from "@/components/admin/cut-editor";

export const metadata = { title: "Morceau" };

export default async function CutEditPage({ params }: { params: Promise<{ key: string }> }) {
  await requireAdminPage();
  const key = decodeURIComponent((await params).key);
  const guide = await getCutGuide();
  const animal = guide.find((a) => a.id === key.split(":")[0]);
  const cut = animal?.cuts.find((c) => c.key === key);
  if (!animal || !cut) notFound();
  const products = (await getProducts(true)).filter((p) => p.category === animal.name);
  return <CutEditor key={key} animal={animal.name} cut={cut} products={products} />;
}
