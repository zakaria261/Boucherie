import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/server/security";
import { getOrderById, getSettings } from "@/lib/server/db";
import { OrderDetail } from "@/components/admin/order-detail";

export const metadata = { title: "Commande" };

export default async function OrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminPage();
  const order = await getOrderById((await params).id);
  if (!order) notFound();
  return <OrderDetail initial={order} shopName={(await getSettings()).name} />;
}
