import type { Metadata } from "next";
import { ShoppingListForm } from "@/components/site/shopping-list-form";

export const metadata: Metadata = {
  title: "Ma liste de courses",
  description:
    "Un produit absent du catalogue ? Transmettez votre liste de courses à la Boucherie du Faubourg : articles, quantités et créneau de retrait à Amiens.",
  alternates: { canonical: "/liste-de-courses" },
};

export default function ListeDeCourses() {
  return (
    <div className="page narrow">
      <header className="page-head">
        <span className="eyebrow">Ma liste de courses</span>
        <h1>Votre liste, préparée par votre boucher.</h1>
        <p>
          Notre vitrine évolue chaque jour ! Vous ne trouvez pas un produit dans notre catalogue ? Indiquez les articles
          souhaités, leurs quantités et votre créneau de retrait. Notre équipe prendra connaissance de votre demande et
          vous contactera si nécessaire.
        </p>
      </header>
      <ShoppingListForm />
    </div>
  );
}
