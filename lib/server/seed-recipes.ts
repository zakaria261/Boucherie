import type { Recipe } from "../types";

type Seed = Omit<Recipe, "createdAt" | "version" | "published">;

// Recettes de base proposées au lancement. Le boucher peut les modifier,
// les masquer ou les supprimer depuis Publications → Recettes.
export const seedRecipes: Seed[] = [
  {
    id: "boeuf-bourguignon",
    title: "Bœuf bourguignon",
    intro:
      "Le plat du dimanche par excellence. Mélangez deux morceaux : un peu gélatineux pour le moelleux, un plus maigre pour la tenue.",
    image: "/images/paleron.jpg",
    servings: 6,
    prepMinutes: 30,
    cookMinutes: 180,
    ingredients: [
      { quantity: 800, unit: "g", name: "Paleron", productId: "paleron" },
      { quantity: 700, unit: "g", name: "Macreuse", productId: "macreuse" },
      { quantity: 75, unit: "cl", name: "Vin rouge de Bourgogne", productId: "" },
      { quantity: 200, unit: "g", name: "Lardons", productId: "" },
      { quantity: 4, unit: "", name: "Carottes", productId: "" },
      { quantity: 250, unit: "g", name: "Champignons de Paris", productId: "" },
      { quantity: 2, unit: "", name: "Oignons", productId: "" },
      { quantity: 1, unit: "", name: "Bouquet garni", productId: "" },
      { quantity: 2, unit: "c. à s.", name: "Farine", productId: "" },
    ],
    steps: [
      "Coupez la viande en cubes de 5 cm et faites-la mariner une nuit dans le vin avec les oignons émincés et le bouquet garni.",
      "Égouttez la viande, épongez-la, puis faites-la dorer en plusieurs fois dans une cocotte avec un filet d’huile.",
      "Faites revenir les lardons et les oignons, saupoudrez de farine, puis remettez la viande.",
      "Versez la marinade portée à ébullition, ajoutez les carottes en rondelles et laissez mijoter 3 heures à feu très doux, couvert.",
      "Ajoutez les champignons poêlés 20 minutes avant la fin. Rectifiez l’assaisonnement.",
    ],
    tip: "Préparé la veille et réchauffé doucement, il est encore meilleur.",
    productIds: ["paleron", "macreuse", "jumeau", "basse-côte"],
  },
  {
    id: "gigot-agneau-roti",
    title: "Gigot d’agneau rôti à l’ail",
    intro:
      "Une cuisson simple et un repos indispensable pour une chair rosée et tendre jusqu’au cœur.",
    image: "/images/gigot.jpg",
    servings: 6,
    prepMinutes: 15,
    cookMinutes: 60,
    ingredients: [
      { quantity: 2000, unit: "g", name: "Gigot d’agneau", productId: "gigot" },
      { quantity: 6, unit: "", name: "Gousses d’ail", productId: "" },
      { quantity: 4, unit: "", name: "Branches de romarin", productId: "" },
      { quantity: 3, unit: "c. à s.", name: "Huile d’olive", productId: "" },
      { quantity: null, unit: "", name: "Sel et poivre", productId: "" },
    ],
    steps: [
      "Sortez le gigot du réfrigérateur une heure avant la cuisson.",
      "Piquez-le avec trois gousses d’ail coupées en deux, badigeonnez d’huile et parsemez de romarin.",
      "Enfournez à 210 °C pendant 15 minutes, puis baissez à 180 °C et comptez 15 minutes par livre.",
      "Arrosez régulièrement avec le jus. Ajoutez les gousses d’ail restantes en chemise à mi-cuisson.",
      "Laissez reposer 15 minutes sous une feuille de papier aluminium avant de trancher.",
    ],
    tip: "Demandez-nous de raccourcir le manche : le gigot rentrera plus facilement dans votre plat.",
    productIds: ["gigot", "épaule"],
  },
  {
    id: "cote-a-los-braise",
    title: "Côte à l’os sur la braise",
    intro:
      "Une belle pièce maturée n’a besoin que d’une braise bien chaude, de gros sel et de patience pendant le repos.",
    image: "/images/cote-a-l-os-mature.jpg",
    servings: 2,
    prepMinutes: 5,
    cookMinutes: 20,
    ingredients: [
      {
        quantity: 1000,
        unit: "g",
        name: "Côte à l’os maturée",
        productId: "côte-à-l-os-maturé",
      },
      { quantity: null, unit: "", name: "Fleur de sel", productId: "" },
      { quantity: null, unit: "", name: "Poivre du moulin", productId: "" },
    ],
    steps: [
      "Sortez la côte du réfrigérateur au moins une heure avant la cuisson.",
      "Saisissez-la 4 à 5 minutes par face sur une braise très vive pour la croûter.",
      "Poursuivez sur le côté du barbecue, à chaleur douce, en la tenant debout sur l’os quelques minutes.",
      "Laissez reposer autant de temps que la cuisson, puis tranchez et salez au dernier moment.",
    ],
    tip: "Pour une côte de 1 kg, visez 52 °C à cœur pour une cuisson saignante.",
    productIds: ["côte-à-l-os-maturé", "côte-à-l-os"],
  },
  {
    id: "blanquette-de-veau",
    title: "Blanquette de veau",
    intro:
      "Un classique familial. Le collier et la poitrine apportent le fondant, l’épaule la tenue.",
    image: "/images/collier-de-veau.jpg",
    servings: 6,
    prepMinutes: 30,
    cookMinutes: 120,
    ingredients: [
      {
        quantity: 800,
        unit: "g",
        name: "Collier de veau",
        productId: "collier-de-veau",
      },
      {
        quantity: 700,
        unit: "g",
        name: "Poitrine de veau",
        productId: "poitrine-de-veau",
      },
      { quantity: 3, unit: "", name: "Carottes", productId: "" },
      { quantity: 1, unit: "", name: "Oignon piqué de clous de girofle", productId: "" },
      { quantity: 250, unit: "g", name: "Champignons de Paris", productId: "" },
      { quantity: 20, unit: "cl", name: "Crème fraîche", productId: "" },
      { quantity: 1, unit: "", name: "Jaune d’œuf", productId: "" },
      { quantity: 40, unit: "g", name: "Beurre", productId: "" },
      { quantity: 40, unit: "g", name: "Farine", productId: "" },
    ],
    steps: [
      "Couvrez la viande d’eau froide, portez à ébullition et écumez soigneusement.",
      "Ajoutez les carottes, l’oignon et un bouquet garni. Laissez frémir 1 h 30.",
      "Préparez un roux avec le beurre et la farine, mouillez avec un litre de bouillon filtré.",
      "Ajoutez les champignons et laissez épaissir 10 minutes.",
      "Hors du feu, liez avec la crème et le jaune d’œuf, puis remettez la viande.",
    ],
    tip: "Servez avec un riz pilaf et un trait de citron dans la sauce.",
    productIds: ["collier-de-veau", "poitrine-de-veau", "jarret-de-veau"],
  },
];
