import { redirect } from "next/navigation";

// Ancienne adresse de « Ma boutique ».
export default function OldShopPage() {
  redirect("/admin/plus/boutique");
}
