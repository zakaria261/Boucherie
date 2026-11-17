// Catalogue des fêtes de fin d'année. Textes repris du livret de la boucherie
// (« Fêtes de fin d'année — Catalogue »). Aucun prix n'y figure : chaque
// produit se demande via la liste de courses, le prix est confirmé par la
// boucherie. Les fiches dont le texte du livret était manifestement erroné
// (descriptions d'agneau recopiées de celles du bœuf, par exemple) restent
// sans description plutôt que d'en inventer une ; le boucher les complète
// depuis Faubourg Pro → Publications → Catalogue des fêtes.

export type FestiveItem = {
  id: string;
  name: string;
  description: string;
  /** Marque, unité, origine, nombre de personnes… une ligne par précision. */
  details: string[];
  cooking: string;
  visible: boolean;
};

export type FestiveSection = { id: string; title: string; intro: string; items: FestiveItem[] };

export type FestiveCatalog = {
  /** Catalogue affiché sur le site (désactivé hors saison). */
  visible: boolean;
  intro: string;
  sections: FestiveSection[];
};

const i = (id: string, name: string, description = "", details: string[] = [], cooking = ""): FestiveItem => ({
  id,
  name,
  description,
  details,
  cooking,
  visible: true,
});

const foie = (id: string, name: string, unit: string, extra: string[] = ["Mi-cuit, cuisson douce"]) =>
  i(id, name, "", [`Unité : ${unit}`, ...extra, "Origine : France"]);

const eminceText = (viande: string, marinades: string) =>
  `Accompagnés d’une délicieuse marinade (${marinades}), ces émincés de ${viande} sont préparés spécialement pour réussir votre plancha ou cuisiner directement à la poêle.`;

export const defaultFestive: FestiveCatalog = {
  visible: true,
  intro:
    "Nous tenons à vous remercier chaleureusement pour votre fidélité et votre confiance tout au long de l’année. Que cette période de fêtes soit remplie de bonheur, de convivialité et de délices partagés autour de nos produits soigneusement préparés pour vous.",
  sections: [
    {
      id: "entrees",
      title: "Nos entrées",
      intro: "",
      items: [
        i("terrine-saumon", "Terrine de saumon", "", ["Marque : Cran d’Escalles", "Élaborée en France", "840 g"]),
        i("terrine-saint-jacques", "Terrine aux noix de Saint-Jacques à la bretonne", "", ["Marque : Guyader", "Élaborée en France", "840 g"]),
        i(
          "crepe-fourree",
          "Crêpe fourrée",
          "Découvrez la délicieuse ficelle picarde, une spécialité régionale composée d’une fine crêpe garnie de jambon, de champignons et d’une onctueuse sauce, gratinée au four. Un incontournable pour ravir vos convives avec une touche de terroir et de convivialité.",
        ),
        i(
          "bouchees-a-la-reine",
          "Bouchées à la reine",
          "Savourez nos bouchées à la reine faites maison, garnies d’une préparation généreuse à base de volaille, de champignons frais et d’une sauce crémeuse. Ce grand classique, préparé avec passion, apportera une touche d’élégance et de gourmandise à vos repas de fête.",
        ),
      ],
    },
    {
      id: "foies-gras",
      title: "Nos foies gras",
      intro:
        "À la Boucherie du Faubourg, nous sommes fiers de vous proposer un foie gras halal d’exception, certifié et issu des meilleurs élevages français. Préparé avec soin et passion, il révèle une texture onctueuse et un goût délicat qui sublimeront vos moments festifs.",
      items: [
        foie("bloc-foie-gras-250", "Bloc de foie gras de canard", "250 g"),
        foie("foie-gras-entier-500", "Foie gras de canard entier", "500 g"),
        foie("bloc-foie-gras-900", "Bloc de foie gras de canard", "900 g"),
        foie("foie-gras-du-faubourg", "Foie gras de canard du Faubourg", "à la découpe"),
        foie("bloc-foie-gras-morceaux", "Bloc de foie gras de canard avec morceaux", "290 g"),
        foie("foie-gras-entier-tranches", "Foie gras de canard entier", "75 g, 2 pièces"),
        foie("foie-gras-extra-deveine", "Foie gras de canard extra déveiné", "450 g", ["Vestey Foods"]),
        foie("foie-gras-entier-180", "Foie gras de canard entier", "180 g"),
      ],
    },
    {
      id: "volailles",
      title: "Nos volailles fermières",
      intro: "",
      items: [
        i(
          "dinde-fermiere",
          "Dinde fermière",
          "La star des tables festives ! Notre dinde fermière, juteuse et savoureuse, garantit un festin chaleureux et authentique.",
          ["Pour 8 à 10 personnes"],
          "3 h de cuisson à 180 °C.",
        ),
        i(
          "chapon-fermier",
          "Chapon fermier",
          "Offrez l’excellence des fêtes avec notre chapon fermier, élevé en plein air et au goût tendre et raffiné, pour un repas mémorable et gourmand.",
          ["Pour 6 à 8 personnes"],
          "2 h 30 de cuisson à 180 °C.",
        ),
        i(
          "pintade-fermiere",
          "Pintade fermière",
          "Sublimez vos repas avec la pintade fermière, délicatement parfumée et à la chair fondante, pour une expérience culinaire unique.",
          ["Pour 4 à 6 personnes"],
          "1 h 30 de cuisson à 200 °C.",
        ),
        i(
          "poulet-fermier",
          "Poulet fermier",
          "Notre poulet fermier est disponible en deux variétés : blanc pour une saveur douce et subtile, et jaune pour un goût plus prononcé. Élevés en plein air, ils offrent une viande tendre et savoureuse, parfaite pour réunir vos proches autour d’un repas mémorable.",
          ["Blanc ou jaune"],
          "1 h 30 à 2 h à 180 °C selon le poids.",
        ),
        i(
          "caille",
          "Caille",
          "Laissez-vous séduire par la finesse de notre caille, idéale pour des plats élégants et raffinés. Sa chair tendre et savoureuse apportera une touche d’originalité à vos repas festifs.",
          [],
          "25 à 30 minutes à 200 °C.",
        ),
        i(
          "poularde-fermiere",
          "Poularde fermière",
          "Apportez l’excellence à votre table avec notre poularde fermière, élevée avec soin pour une chair moelleuse et généreuse. Parfaite pour les repas chaleureux et conviviaux.",
          [],
          "2 h à 180 °C pour 2,5 kg.",
        ),
        i(
          "coquelet",
          "Coquelet",
          "Notre coquelet fermier, élevé en plein air pour une chair tendre et savoureuse, est parfait pour un repas convivial et raffiné. Il ravira vos papilles avec ses saveurs authentiques et sa cuisson rapide.",
          ["Pour 1 ou 2 personnes"],
          "45 à 50 minutes à 200 °C.",
        ),
        i(
          "magret-de-canard",
          "Magret de canard",
          "Succombez à l’élégance du magret de canard, une viande tendre et savoureuse, au goût délicatement fumé et raffiné. Parfait pour sublimer vos assiettes avec une touche gastronomique.",
          [],
          "6 à 8 minutes côté peau, 2 à 3 minutes côté chair, à feu moyen.",
        ),
        i(
          "lapin-fermier",
          "Lapin fermier",
          "Apportez une touche de tradition et de finesse à votre table avec notre lapin fermier, à la chair tendre et parfumée, parfait pour des recettes mijotées ou rôties.",
          [],
          "1 h à 1 h 15 au four à 180 °C, ou 45 minutes en cocotte à feu doux.",
        ),
      ],
    },
    {
      id: "farces",
      title: "Nos farces maison",
      intro:
        "Préparées avec soin et passion, nos farces maison sont l’accompagnement parfait pour farcir nos volailles fermières, rôtis et autres délices.",
      items: [
        i(
          "farce-fine-du-faubourg",
          "Farce fine du Faubourg",
          "Une création exclusive et secrète ! Notre farce fine du Faubourg, à base de veau haché mariné, est sublimée par une sauce verte unique et une touche de légume sucré. Un équilibre parfait de saveurs, mais chut… c’est notre recette maison !",
        ),
        i(
          "farce-veau-legumes",
          "Farce de veau aux légumes",
          "Apportez fraîcheur et légèreté à vos plats avec cette farce délicate, composée de veau haché et d’un mélange subtil de légumes frais, pour une saveur douce et équilibrée.",
        ),
        i(
          "farce-veau-foie-gras",
          "Farce de veau au foie gras",
          "Un véritable délice raffiné : notre farce de veau au foie gras marie la tendreté de la viande et la richesse du foie gras pour des recettes festives et luxueuses.",
        ),
        i(
          "farce-volaille-forestiere",
          "Farce volaille forestière",
          "Embarquez vos papilles en forêt avec cette farce généreuse à base de volaille et de champignons frais, pour des plats parfumés et réconfortants, parfaits pour la saison.",
        ),
      ],
    },
    {
      id: "boeuf",
      title: "Bœuf de région : nos pièces d’exception",
      intro: "",
      items: [
        i(
          "roti-tende-de-tranche",
          "Rôti tende de tranche",
          "Découvrez la finesse de notre rôti tende de tranche, un morceau maigre et tendre, parfait pour une viande fondante et savoureuse à chaque bouchée.",
          [],
          "15 à 20 minutes par 500 g à 200 °C, pour une cuisson saignante.",
        ),
        i(
          "roti-filet-de-rumsteck",
          "Rôti filet de rumsteck",
          "Laissez-vous séduire par le rôti filet de rumsteck, une viande juteuse et délicatement persillée, idéale pour des repas de fête riches en saveurs.",
          [],
          "12 à 15 minutes par 500 g à 200 °C, selon la cuisson souhaitée.",
        ),
        i(
          "roti-filet-de-boeuf",
          "Rôti filet de bœuf",
          "Élégance et gourmandise se rencontrent dans notre rôti filet de bœuf, un choix raffiné à la texture exceptionnelle, qui sublimera vos tables festives.",
          [],
          "10 à 12 minutes par 500 g à 200 °C, pour une cuisson rosée.",
        ),
        i(
          "tournedos-filet-de-boeuf",
          "Tournedos filet de bœuf",
          "Raffinement et tendreté absolue, le tournedos filet de bœuf fond en bouche et se prête aux plus belles recettes gastronomiques.",
          [],
          "3 à 4 minutes de chaque côté pour une cuisson saignante, à feu vif.",
        ),
        i(
          "tomahawk",
          "Tomahawk",
          "Impressionnez vos convives avec le tomahawk, cette pièce spectaculaire au goût intense et à la texture succulente, idéale pour les amateurs de viande.",
          [],
          "10 à 12 minutes par côté pour 1 kg, à feu moyen, puis repos sous aluminium.",
        ),
        i(
          "cote-de-boeuf",
          "Côte de bœuf",
          "La noblesse de la viande s’invite chez vous avec notre côte de bœuf, juteuse et persillée, parfaite pour un repas de caractère.",
          [],
          "10 à 12 minutes par kg, en aller-retour sur feu vif, puis au four à 180 °C.",
        ),
        i(
          "cote-de-boeuf-maturee",
          "Côte de bœuf maturée",
          "Offrez-vous une expérience gustative exceptionnelle avec notre côte de bœuf maturée, intensément savoureuse et d’une tendreté incomparable, idéale pour sublimer vos repas de fête.",
          [],
          "10 à 12 minutes par kg, aller-retour sur feu vif, puis finition au four à 180 °C.",
        ),
        i(
          "cote-en-or",
          "La Côte en Or",
          "Une pièce d’exception de bœuf sélectionnée pour sa tendreté et son persillage parfait. Cette viande noble, idéale pour les grandes occasions, offre une expérience gustative intense et savoureuse qui fera briller vos tables de fête.",
          [],
          "12 à 15 minutes par kg, aller-retour sur feu vif, puis finition au four à 180 °C.",
        ),
      ],
    },
    {
      id: "agneau",
      title: "Agneau d’excellence",
      intro: "",
      items: [
        i("gigot-d-agneau", "Gigot d’agneau"),
        i("gigot-desosse-ficele", "Gigot désossé ficelé"),
        i("souris-d-agneau", "Souris d’agneau"),
        i("epaule-d-agneau", "Épaule d’agneau"),
        i("epaule-desossee-ficelee", "Épaule désossée ficelée"),
        i("carre-d-agneau", "Carré d’agneau"),
        i(
          "couronne-d-agneau",
          "Couronne d’agneau",
          "Une pièce majestueuse à la présentation raffinée et à la chair tendre et savoureuse. Idéale pour impressionner vos convives, son esthétique unique en fait un choix parfait pour un repas festif qui marquera les esprits.",
          [],
          "25 à 30 minutes par kg à 180 °C.",
        ),
      ],
    },
    {
      id: "veau",
      title: "Les rôtis de veau",
      intro: "",
      items: [
        i(
          "roti-quasi-de-veau",
          "Rôti quasi de veau",
          "Sublimez vos repas avec le rôti quasi de veau, une viande délicate et fondante, idéale pour des saveurs douces et authentiques.",
          [],
          "45 minutes par kg à 180 °C.",
        ),
        i(
          "roti-de-veau-orloff",
          "Rôti de veau Orloff",
          "Alliez tradition et gourmandise avec le rôti de veau Orloff, garni de fromage et de jambon pour un plat riche et savoureux.",
          [],
          "1 h par kg à 180 °C, couvert pour préserver le moelleux.",
        ),
        i(
          "roti-de-veau-norvegien",
          "Rôti de veau norvégien",
          "Surprenez vos invités avec le rôti de veau norvégien, une alliance délicate entre le veau tendre et le saumon fumé pour une explosion de saveurs.",
          [],
          "50 minutes par kg à 180 °C.",
        ),
      ],
    },
    {
      id: "dinde",
      title: "Les rôtis de dinde",
      intro: "",
      items: [
        i(
          "roti-de-dinde",
          "Rôti de dinde",
          "Optez pour la simplicité et le goût authentique avec notre rôti de dinde nature bardé, tendre et juteux, idéal pour des repas légers et savoureux.",
          [],
          "40 minutes par kg à 180 °C.",
        ),
        i(
          "roti-dinde-savoyard",
          "Rôti de dinde savoyard",
          "Faites fondre de plaisir vos convives avec notre rôti de dinde savoyard, garni de raclette, cheddar, emmental et enrobé de bacon fumé, pour un mélange gourmand et généreux.",
          [],
          "45 minutes par kg à 180 °C.",
        ),
        i(
          "roti-dinde-provencale",
          "Rôti de dinde provençale",
          "Laissez-vous séduire par les saveurs méditerranéennes de notre rôti de dinde provençal, farci d’une délicate préparation de veau et légumes de saison, pour un plat riche en parfums.",
          [],
          "50 minutes par kg à 180 °C.",
        ),
        i(
          "roti-dinde-savoyard-farci",
          "Rôti de dinde savoyard farci",
          "Offrez le meilleur des fêtes avec notre rôti de dinde savoyard farci, alliant fromage fondant, bacon fumé et une farce fine de veau pour une explosion de saveurs.",
        ),
        i("roti-dinde-farci", "Rôti de dinde farci"),
        i(
          "boudin-blanc",
          "Boudin blanc",
          "Découvrez l’élégance et la légèreté de nos boudins blancs halal, 100 % poulet avec une touche de champignon, pour des entrées festives raffinées.",
          [],
          "10 à 12 minutes à feu moyen, à la poêle.",
        ),
      ],
    },
    {
      id: "plateaux",
      title: "Nos plateaux à partager",
      intro: "",
      items: [
        i(
          "assortiment-pierrade",
          "Assortiment pierrade",
          "Partagez un moment convivial autour de notre assortiment pour pierrade, composé de viandes finement coupées, tendres et savoureuses. Disponible en version nature pour sublimer la qualité du produit, ou délicatement mariné pour une explosion de saveurs. Prêt à cuire en quelques minutes, idéal pour un repas festif et interactif.",
          ["Prévoir 200 à 250 g par personne", "Nature ou mariné"],
        ),
        i(
          "fondue-bourguignonne",
          "Fondue bourguignonne",
          "Un assortiment varié spécialement conçu pour la fondue bourguignonne, composé de morceaux tendres et savoureux de bœuf, veau, poulet, dinde ou agneau. Chaque pièce est soigneusement préparée pour garantir une cuisson rapide.",
          ["Prévoir 200 à 250 g par personne"],
        ),
        i(
          "plateau-charcuterie",
          "Plateau charcuterie",
          "Notre plateau de charcuterie artisanale halal, composé d’une sélection raffinée de jambons, saucissons, mortadelles et autres spécialités préparées avec soin. Parfaitement présenté, il s’adapte à toutes vos envies festives.",
          ["Prévoir environ 150 à 200 g par personne pour un apéritif"],
        ),
      ],
    },
    {
      id: "eminces",
      title: "Nos émincés",
      intro: "Pour nos plateaux pierrade ou les fondues bourguignonnes.",
      items: [
        i("emince-de-poulet", "Émincé de poulet", eminceText("poulet", "curry indien, tex mex, ail des ours, thym citron, oriental, tandoori")),
        i("emince-de-veau", "Émincé de veau", eminceText("veau", "curry indien, tex mex, ail des ours, thym citron, oriental, tandoori")),
        i("emince-de-rumsteck", "Émincé de rumsteck", eminceText("bœuf", "tex mex, ail des ours, 3 poivres, oriental, barbecue")),
        i("emince-de-dinde", "Émincé de dinde", eminceText("dinde", "tex mex, ail des ours, oriental, tandoori")),
      ],
    },
    {
      id: "aperitif-brunch",
      title: "Apéritif et brunch",
      intro: "",
      items: [
        i(
          "assortiment-sale",
          "Assortiment salé à partager",
          "Faites plaisir à vos invités avec notre assortiment de pièces salées, parfait pour vos apéritifs et buffets festifs. Mini burgers maison savoureux, toasts raffinés au foie gras, au saumon fumé ou garnitures variées : chaque bouchée est préparée avec soin pour sublimer vos moments de convivialité.",
        ),
        i(
          "plateau-brunch",
          "Plateau brunch",
          "Une sélection variée et généreuse : fromage frais onctueux, charcuterie artisanale halal, céréales croquantes, différentes variétés de pains, fruits secs, accompagnés de nos tapenades maison. Idéal pour partager un moment convivial et gourmand en toute simplicité. Rien à faire, juste à profiter de l’instant présent…",
        ),
      ],
    },
  ],
};
