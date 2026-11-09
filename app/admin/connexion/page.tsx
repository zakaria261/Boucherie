import { redirect } from "next/navigation";
import { currentAdmin, hasAdmin } from "@/lib/server/security";
import { getSettings } from "@/lib/server/db";
import { AdminLogin } from "@/components/admin-login";
export default async function Login() {
  if (await currentAdmin()) redirect("/admin");
  return (
    <AdminLogin
      setup={!hasAdmin()}
      configured={Boolean(process.env.ADMIN_SETUP_TOKEN)}
      logo={getSettings().logo}
    />
  );
}
