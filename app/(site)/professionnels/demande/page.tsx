import type { Metadata } from "next";
import { ProRequestForm } from "@/components/site/pro-request-form";

export const metadata: Metadata = {
  title: "Demande professionnelle",
  alternates: { canonical: "/professionnels/demande" },
};

export default function DemandePro() {
  return (
    <div className="page narrow">
      <header className="page-head">
        <span className="eyebrow">Espace professionnels</span>
        <h1>Votre demande</h1>
        <p>Quelques minutes suffisent. Votre saisie est conservée si vous revenez en arrière.</p>
      </header>
      <ProRequestForm />
    </div>
  );
}
