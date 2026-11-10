import type { Metadata } from "next";
import { MealPlanner } from "@/components/site/meal-planner";

export const metadata: Metadata = {
  title: "Que cuisiner ?",
  description:
    "Une idée de viande selon votre repas, le nombre de convives et votre budget, avec les quantités conseillées.",
  alternates: { canonical: "/que-cuisiner" },
};

export default function QueCuisiner() {
  return (
    <div className="page narrow">
      <header className="page-head">
        <span className="eyebrow">Recettes et conseils</span>
        <h1>Que cuisiner ?</h1>
        <p>Trois questions, et nous vous proposons les morceaux et les quantités.</p>
      </header>
      <MealPlanner />
    </div>
  );
}
