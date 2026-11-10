import type { Metadata } from "next";
import { MyOrders } from "@/components/site/my-orders";

export const metadata: Metadata = {
  title: "Mes commandes",
  robots: { index: false, follow: true },
};

export default function MesCommandes() {
  return (
    <div className="page narrow">
      <header className="page-head">
        <span className="eyebrow">Sur cet appareil</span>
        <h1>Mes commandes</h1>
        <p>
          Vos commandes récentes passées depuis ce téléphone ou cet ordinateur.
          Aucun compte n’est nécessaire.
        </p>
      </header>
      <MyOrders />
    </div>
  );
}
