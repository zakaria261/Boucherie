import { requireAdminPage } from "@/lib/server/security";
import { getOrders, getSettings } from "@/lib/server/db";
import { AdminShell } from "@/components/admin/shell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requireAdminPage();
  return (
    <AdminShell initialOrders={getOrders()} logo={getSettings().logo}>
      {children}
    </AdminShell>
  );
}
