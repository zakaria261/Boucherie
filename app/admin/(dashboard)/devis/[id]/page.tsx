import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/server/security";
import { getQuote } from "@/lib/server/db";
import { QuoteEditor } from "@/components/admin/quotes";
import { siteUrl } from "@/lib/site";

export const metadata = { title: "Devis" };

export default async function QuotePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage();
  const quote = await getQuote((await params).id);
  if (!quote) notFound();
  const origin = process.env.APP_ORIGIN || siteUrl;
  return <QuoteEditor key={quote.id} initial={quote} clientUrl={`${origin}/professionnels/devis/${quote.token}`} />;
}
