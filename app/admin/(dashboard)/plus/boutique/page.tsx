import { requireAdminPage } from "@/lib/server/security";
import { getSettings } from "@/lib/server/db";
import { ShopSettings } from "@/components/admin/settings";

export const metadata = { title: "Ma boutique" };

export default async function ShopPage() {
  await requireAdminPage();
  const settings = await getSettings();
  return <ShopSettings initial={settings} />;
}
