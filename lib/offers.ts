// Lots et marinades de la boutique. Textes repris des documents de la
// boucherie. Ingrédients et allergènes des marinades : non communiqués dans
// ces documents, ils restent vides (jamais inventés) et se complètent depuis
// Faubourg Pro → Publications → Lots et marinades.

export type Marinade = {
  id: string;
  name: string;
  description: string;
  /** Liste des ingrédients, telle que fournie par la boucherie. */
  ingredients: string;
  /** Allergènes (règlement INCO), tels que fournis par la boucherie. */
  allergens: string;
  visible: boolean;
};

export type Lot = {
  id: string;
  name: string;
  /** Contenu, une ligne par produit. */
  items: string[];
  /** Prix du lot en centimes. */
  price: number;
  note: string;
  /** Jours de retrait autorisés (0 = dimanche … 6 = samedi) ; vide : tous. */
  days: number[];
  /** Le client peut choisir une marinade (lot contenant des produits marinés). */
  marinade: boolean;
  visible: boolean;
};

export type Offers = { marinades: Marinade[]; lots: Lot[] };

const m = (id: string, name: string, description: string): Marinade => ({
  id,
  name,
  description,
  ingredients: "",
  allergens: "",
  visible: true,
});

export const defaultMarinades: Marinade[] = [
  m("ail-des-ours", "Ail des ours", "Une marinade végétale au parfum intense d’ail des ours, pour des viandes pleines de caractère et de fraîcheur."),
  m("tex-mex", "Tex Mex", "Une sauce gourmande aux notes fumées et épicées, idéale pour des grillades à l’accent du sud-ouest américain."),
  m("oriental", "Oriental", "Un subtil mélange d’épices comme le cumin et la coriandre, pour une viande au parfum d’ailleurs. Un de nos best-sellers !"),
  m("curry-indien", "Curry indien", "Une recette riche en saveurs où les épices douces du curry s’équilibrent avec une note acidulée."),
  m("tandoori", "Tandoori", "Une marinade généreuse mêlant yaourt et épices pour une viande tendre et intensément parfumée."),
  m("chili-thai", "Chili thaï", "Une sauce sucrée-salée au sésame et au piment doux, pour une touche asiatique raffinée et légèrement piquante."),
  m("curry-coco", "Curry coco", "L’exotisme à l’état pur : une base douce de coco sublimée par le curry pour un voyage immédiat en Asie."),
  m("trois-poivres", "3 poivres", "Un mélange intense de poivres blancs, verts et noirs pour les amateurs de sensations relevées et de finesse aromatique."),
  m("paprika-miel", "Paprika miel", "L’équilibre parfait entre la douceur du miel et la chaleur subtile du paprika, pour une touche sucrée-salée irrésistible."),
  m("mexicaine", "Mexicaine", "Une sauce relevée à base de tomate et d’épices pour retrouver l’authenticité des saveurs tex-mex."),
  m("thym-citron", "Thym citron", "Une recette fraîche et parfumée où le thym se marie au citron pour une touche méditerranéenne et ensoleillée."),
  m("creme-girolle", "Crème girolle", "Crémeuse et généreuse, cette marinade aux girolles offre un goût boisé et délicat qui sublime toutes les pièces nobles."),
  m("boursin", "Boursin", "Une marinade onctueuse et gourmande au bon goût de Boursin, relevée d’une touche de ciboulette. Un classique qui plaît à tous."),
  m("creme-echalote", "Crème échalote", "Douce et savoureuse, cette marinade marie la finesse de l’échalote à une base crémeuse idéale pour sublimer toutes vos viandes blanches."),
  m("maitre-d-hotel", "Maître d’hôtel", "Un grand classique revisité avec du persil frais et une pointe de citron pour une note herbacée et rafraîchissante."),
  m("marocaine", "Marocaine", "Une explosion d’épices orientales avec coriandre et cumin pour une viande parfumée et chaleureuse."),
  m("tandoori-cheddar", "Tandoori cheddar", "Mariage audacieux entre les épices tandoori et le fondant du cheddar pour une marinade pleine de caractère."),
];

const lot = (id: string, name: string, items: string[], euros: number, extra: Partial<Lot> = {}): Lot => ({
  id,
  name,
  items,
  price: euros * 100,
  note: "",
  days: [],
  marinade: items.some((i) => /marin/i.test(i)),
  visible: true,
  ...extra,
});

export const defaultLots: Lot[] = [
  lot("lot-1", "Lot n° 1", ["1 kg de viande hachée", "1 kg de merguez", "1 kg de filet de poulet"], 35),
  lot("lot-2", "Lot n° 2", ["1 kg de bourguignon", "1 kg de viande hachée", "1 kg d’ailes de poulet", "1 kg de filet de poulet"], 45),
  lot("lot-3", "Lot n° 3", ["1 kg de bifteck", "1 kg de viande hachée", "1 kg de filet de poulet", "1 kg de merguez maison"], 55),
  lot("lot-4", "Lot n° 4", [
    "1 kg de saucisses de poulet",
    "1 kg de cuisses de poulet",
    "1 kg de filet de dinde",
    "1 kg de bourguignon",
    "1 kg de viande hachée",
    "1 kg de bifteck",
  ], 75),
  lot("lot-eco", "Lot éco", ["500 g de filet de poulet", "500 g de viande hachée", "500 g de merguez maison"], 19),
  lot("lot-bbq", "Lot BBQ", [
    "1 kg d’émincé de bœuf mariné",
    "1 kg d’émincé de poulet mariné",
    "1 kg de merguez maison",
    "1 kg de chipolatas de veau maison",
    "1 kg de pilons de poulet marinés",
  ], 65),
  lot("lot-bbq-max", "Lot BBQ Max", [
    "1 kg d’émincé de bœuf mariné",
    "1 kg d’émincé de poulet mariné",
    "1 kg de merguez maison",
    "1 kg de chipolatas de veau maison",
    "1 kg de saucisses de poulet (mix)",
    "1 kg de cuisses de poulet désossées",
  ], 80),
  lot("lot-gourmand", "Lot gourmand", [
    "1 kg de rumsteck",
    "1 kg de viande hachée",
    "1 kg de filet de poulet",
    "1 kg de pilons de poulet",
    "1 kg de merguez",
  ], 65),
  lot("lot-du-mois", "Lot du mois", [
    "1 kg d’émincé de poulet mariné",
    "1 kg de pilons marinés",
    "1 kg de kefta maison",
    "1 kg de boulettes de poulet",
    "1 kg de cuisses de poulet désossées",
  ], 55),
  lot("lot-familial", "Lot familial", [
    "1 kg de bourguignon",
    "1 kg de viande hachée",
    "1 kg de bifteck",
    "1 kg de filet de poulet",
    "1 kg de cuisses de poulet marinées",
    "1 kg de poulet PAC",
    "1 kg de pilons de poulet",
  ], 80),
  lot("lot-poulet-roti", "Lot poulet rôti", ["1 poulet rôti", "1 barquette de pommes de terre, sauce provençale"], 13, {
    note: "Uniquement le week-end.",
    days: [6, 0],
    marinade: false,
  }),
];

export const defaultOffers: Offers = { marinades: defaultMarinades, lots: defaultLots };

const dayNames = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
/** « samedi et dimanche » */
export const daysLabel = (days: number[]) =>
  days.length ? [...days].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map((d) => dayNames[d]).join(" et ") : "";
