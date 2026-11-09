import { AdminOrders } from "@/components/admin-orders";
import { getOrders } from "@/lib/server/db";
import { requireAdminPage } from "@/lib/server/security";
export default async function Orders() {
  await requireAdminPage();
  return <AdminOrders initial={getOrders()} />;
}
