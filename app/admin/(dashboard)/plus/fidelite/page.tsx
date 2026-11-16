import { requireAdminPage } from "@/lib/server/security";
import { getSettings } from "@/lib/server/db";
import { LoyaltyScreen } from "@/components/admin/team-loyalty";

export const metadata = { title: "Fidélité" };

export default async function LoyaltyPage() {
  const admin = await requireAdminPage();
  return <LoyaltyScreen initial={(await getSettings()).loyalty} owner={admin.role === "owner"} />;
}
