import { requireAdminPage } from "@/lib/server/security";
import { getSettings } from "@/lib/server/db";
import { AdminShell } from "@/components/admin-shell";
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireAdminPage();
  return (
    <AdminShell email={admin.email} settings={getSettings()}>
      {children}
    </AdminShell>
  );
}
