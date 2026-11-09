import { Checkout } from "@/components/checkout";
export const metadata = {
  title: "Commander sur WhatsApp | Boucherie du Faubourg",
  robots: { index: false, follow: false },
};
export default function Commande() {
  return <Checkout />;
}
