import { requireAdminPage } from "@/lib/server/security";
import { getOffers } from "@/lib/server/offers";
import { OffersEditor } from "@/components/admin/offers-editor";

export const metadata = { title: "Lots et marinades" };

export default async function OffersPage() {
  await requireAdminPage();
  return <OffersEditor initial={await getOffers()} />;
}
