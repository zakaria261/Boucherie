import { Suspense } from "react";
import { requireAdminPage } from "@/lib/server/security";
import { OrdersScreen } from "@/components/admin/orders";

export const metadata = { title: "Commandes" };

export default async function OrdersPage() {
  await requireAdminPage();
  return (
    <Suspense>
      <OrdersScreen />
    </Suspense>
  );
}
