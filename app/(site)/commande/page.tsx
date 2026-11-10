import type { Metadata } from "next";
import { Checkout } from "@/components/site/checkout";

export const metadata: Metadata = {
  title: "Votre commande",
  robots: { index: false, follow: true },
};

export default function Commande() {
  const customerWhatsapp = !!(
    process.env.WHATSAPP_ACCESS_TOKEN &&
    process.env.WHATSAPP_PHONE_NUMBER_ID &&
    process.env.WHATSAPP_GRAPH_API_VERSION &&
    process.env.WHATSAPP_CUSTOMER_TEMPLATE
  );
  return <Checkout customerWhatsapp={customerWhatsapp} />;
}
