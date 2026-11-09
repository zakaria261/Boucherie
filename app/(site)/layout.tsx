import { StoreShell } from "@/components/store";
import { getProducts, getSettings } from "@/lib/server/db";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <StoreShell products={getProducts()} settings={getSettings()}>
      {children}
    </StoreShell>
  );
}
