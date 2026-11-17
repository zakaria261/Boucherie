import { requireAdminPage } from "@/lib/server/security";
import { getFestive } from "@/lib/server/fetes";
import { FestiveEditor } from "@/components/admin/festive-editor";

export const metadata = { title: "Catalogue des fêtes" };

export default async function FestivePage() {
  await requireAdminPage();
  return <FestiveEditor initial={await getFestive()} />;
}
