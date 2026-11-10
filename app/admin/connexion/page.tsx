import { Suspense } from "react";
import { redirect } from "next/navigation";
import { currentAdmin, hasAdmin } from "@/lib/server/security";
import { AdminLogin } from "@/components/admin/login";

export const metadata = { title: "Connexion" };

export default async function Login() {
  if (await currentAdmin()) redirect("/admin");
  return (
    <Suspense>
      <AdminLogin
        setup={!(await hasAdmin())}
        configured={Boolean(process.env.ADMIN_SETUP_TOKEN)}
      />
    </Suspense>
  );
}
