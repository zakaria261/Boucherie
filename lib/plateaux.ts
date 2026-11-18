// Plateaux à partager. Textes repris du catalogue de la boucherie (page
// « Nos plateaux à partager »). Pas de prix : la boucherie compose le plateau
// selon le nombre de personnes ou le budget indiqué, puis confirme.

export type Plateau = {
  id: string;
  name: string;
  description: string;
  /** Grammage conseillé par personne, en grammes [min, max]. */
  perPerson: [number, number];
  /** Libellé du grammage conseillé. */
  portion: string;
  /** Versions proposées (ex. nature ou marinée) ; vide : une seule version. */
  options: string[];
  /** Version pour laquelle le client peut choisir une marinade. */
  marinatedOption?: string;
  image: string;
};

export const plateaux: Plateau[] = [
  {
    id: "fondue-bourguignonne",
    name: "Fondue bourguignonne",
    description:
      "Un assortiment varié spécialement conçu pour la fondue bourguignonne, composé de morceaux tendres et savoureux de bœuf, veau, poulet, dinde ou agneau. Chaque pièce est soigneusement préparée pour garantir une cuisson rapide.",
    perPerson: [200, 250],
    portion: "Prévoir 200 à 250 g par personne",
    options: [],
    image: "/images/plateaux/fondue.jpg",
  },
  {
    id: "pierrade-plancha",
    name: "Pierrade et plancha",
    description:
      "Un assortiment de viandes finement coupées, tendres et savoureuses. Disponible en version nature pour sublimer la qualité du produit ou délicatement marinée pour une explosion de saveurs. Prêt à cuire en quelques minutes, idéal pour un repas festif et convivial.",
    perPerson: [200, 250],
    portion: "Prévoir 200 à 250 g par personne",
    options: ["Nature", "Marinée"],
    marinatedOption: "Marinée",
    image: "/images/plateaux/pierrade.jpg",
  },
  {
    id: "plateau-charcuterie",
    name: "Plateau charcuterie",
    description:
      "Notre plateau de charcuterie artisanale halal, composé d’une sélection raffinée de jambons, saucissons, mortadelles et autres spécialités préparées avec soin. Parfaitement présenté, il s’adapte à toutes vos envies.",
    perPerson: [150, 200],
    portion: "Prévoir environ 150 à 200 g par personne pour un apéritif",
    options: [],
    image: "/images/plateaux/charcuterie.jpg",
  },
];

export const MAX_PEOPLE = 80;
export const BUDGET_RANGE = [15, 3000] as const;

const kg = (grams: number) =>
  grams >= 1000 ? `${(grams / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} kg` : `${grams} g`;

/** « environ 2 à 2,5 kg » pour un nombre de personnes donné. */
export function estimateLabel(p: Plateau, people: number) {
  const [min, max] = p.perPerson;
  return `environ ${kg(min * people)} à ${kg(max * people)}`;
}
