import { requireAdminPage } from "@/lib/server/security";
import { getCutGuide } from "@/lib/server/cut-guide";
import { CutGuideAdmin } from "@/components/admin/cut-editor";

export const metadata = { title: "Guide des morceaux" };

export default async function CutGuidePage() {
  await requireAdminPage();
  return <CutGuideAdmin guide={await getCutGuide()} />;
}
