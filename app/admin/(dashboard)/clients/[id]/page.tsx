import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/server/security";
import { getCompany, getOrders, getQuotes } from "@/lib/server/db";
import { ClientDetail } from "@/components/admin/clients";
import { siteUrl } from "@/lib/site";

export const metadata = { title: "Client professionnel" };

export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage();
  const company = await getCompany((await params).id);
  if (!company) notFound();
  const orders = (await getOrders()).filter((o) => o.companyId === company.id);
  const quotes = (await getQuotes()).filter((q) => q.companyId === company.id);
  const origin = process.env.APP_ORIGIN || siteUrl;
  return (
    <ClientDetail
      key={company.id}
      initial={company}
      orders={orders}
      quotes={quotes}
      spaceUrl={`${origin}/professionnels/espace/${company.accessToken}`}
    />
  );
}
