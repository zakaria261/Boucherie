// Fiches des morceaux. Identifiant stable « espèce:morceau ». Les durées sont
// données pour une épaisseur ou un poids précis : elles servent de repère et
// varient selon l'appareil. Les produits sont liés uniquement lorsqu'ils
// correspondent explicitement au morceau ; la photo n'est utilisée que si elle
// montre bien ce morceau (une photo différente par morceau).
import type { AnimalId } from "./cuts";

export type CutContent = {
  name: string;
  /** Libellé court pour la carte (facultatif). */
  label?: string;
  summary: string;
  texture: string;
  flavor: string;
  bone: string;
  cooking: string[];
  tip: string;
  dish: string;
  image: string;
  productIds: string[];
};

type Entry = Omit<CutContent, "image" | "productIds"> & { image?: string; productIds?: string[] };

const boeuf: Record<string, Entry> = {
  queue: {
    name: "Queue",
    summary:
      "Gélatineuse et généreuse, la queue fond littéralement après une longue cuisson. Elle donne aux bouillons et aux ragoûts une profondeur incomparable.",
    texture: "Viande entrelardée autour des vertèbres, riche en collagène qui devient fondant.",
    flavor: "Goût de bœuf intense et parfumé.",
    bone: "Avec os, vendue en tronçons.",
    cooking: [
      "Pot-au-feu, bouillon : à frémissement, 3 h 30 à 4 h pour des tronçons de 5 à 7 cm.",
      "Braisée en cocotte à couvert, four à 150 °C, 3 à 4 h, jusqu’à ce que la chair se détache de l’os.",
    ],
    tip: "Faites-la colorer franchement avant de mouiller. Préparée la veille, elle se dégraisse facilement une fois refroidie.",
    dish: "Queue de bœuf braisée au vin rouge, purée maison.",
  },
  "poire-merlan": {
    name: "Poire et merlan",
    summary:
      "Deux petits muscles de la cuisse, rares et très recherchés : on n’en tire que quelques steaks par bête. Tendres et maigres, ils se réservent souvent au comptoir.",
    texture: "Grain fin, très tendre, peu de gras.",
    flavor: "Goût délicat, proche du filet pour le merlan.",
    bone: "Sans os.",
    cooking: [
      "Poêle ou grill très chauds : steak de 2 cm, 1 à 2 min par face pour une cuisson saignante.",
      "Tartare ou carpaccio pour le merlan, préparé le jour même.",
    ],
    tip: "Sortez-les du réfrigérateur 30 min avant la cuisson et ne dépassez pas « à point » : ces morceaux maigres sèchent vite.",
    dish: "Steak de merlan, sauce au poivre et pommes grenaille.",
    image: "/images/merlan.jpg",
    productIds: ["merlan"],
  },
  "rond-de-gite": {
    name: "Rond de gîte",
    summary:
      "Muscle long et régulier de l’arrière de la cuisse, maigre et sans nerf. Il se tranche très finement et donne un rôti à la découpe nette.",
    texture: "Fibres serrées, très maigre.",
    flavor: "Saveur douce.",
    bone: "Sans os.",
    cooking: [
      "Rôti de 1 kg (5 à 6 cm de diamètre) : saisir, puis four à 180 °C, environ 15 min par 500 g pour un cœur rosé.",
      "En tranches très fines : carpaccio ou fondue chinoise.",
    ],
    tip: "Laissez reposer le rôti 10 min sous une feuille d’aluminium, puis tranchez finement contre le sens des fibres.",
    dish: "Rôti de bœuf froid tranché fin, sauce tartare et pommes de terre en salade.",
  },
  "gite-a-la-noix": {
    name: "Gîte à la noix",
    summary:
      "Morceau maigre et économique de la cuisse, très polyvalent : rôtis, steaks à mariner et excellente viande à fondue.",
    texture: "Fibres longues, maigre ; il durcit s’il est trop cuit.",
    flavor: "Goût franc de bœuf.",
    bone: "Sans os.",
    cooking: [
      "Rôti : saisir, puis four à 180 °C, environ 15 min par 500 g pour rosé.",
      "Fondue bourguignonne : dés de 2 cm, quelques dizaines de secondes dans l’huile chaude.",
      "Steak mariné de 1,5 cm : poêle très chaude, 1 à 2 min par face.",
    ],
    tip: "Une marinade huile, ail et herbes d’au moins 2 h attendrit les steaks ; tranchez toujours contre le grain.",
    dish: "Fondue bourguignonne et ses sauces maison.",
  },
  "tende-de-tranche": {
    name: "Tende de tranche",
    summary:
      "Grand muscle intérieur de la cuisse, l’un des morceaux à griller les plus tendres après ceux de l’aloyau. Il donne des biftecks réguliers et de bons rôtis.",
    texture: "Tendre, grain fin, maigre.",
    flavor: "Goût doux.",
    bone: "Sans os.",
    cooking: [
      "Bifteck de 1,5 à 2 cm : poêle ou plancha à feu vif, 1 min 30 à 2 min par face pour saignant.",
      "Rôti : saisir, puis four à 200 °C, environ 15 min par 500 g pour rosé.",
      "Tartare, haché ou coupé au couteau le jour même.",
    ],
    tip: "Salez juste avant la cuisson et poivrez à la sortie : à feu vif, le poivre brûle.",
    dish: "Bifteck, beurre maître d’hôtel et frites maison.",
    image: "/images/tende-de-tranche.jpg",
    productIds: ["tende-de-tranche"],
  },
  rumsteck: {
    name: "Rumsteck",
    summary:
      "Dans la hanche, à l’arrière du faux-filet, le rumsteck est tendre et savoureux tout en restant maigre. Un grand classique des grillades et des brochettes.",
    texture: "Tendre, grain fin ; le cœur de rumsteck est la partie la plus tendre.",
    flavor: "Goût de bœuf prononcé.",
    bone: "Sans os.",
    cooking: [
      "Pavé de 3 cm : poêle très chaude, 2 à 3 min par face pour saignant, puis 3 min de repos.",
      "Brochettes au barbecue sur braises vives, 6 à 8 min en les retournant.",
      "Rôti dans le cœur de rumsteck, servi rosé.",
    ],
    tip: "Pour un pavé épais, saisissez fortement puis terminez quelques minutes au four à 180 °C : la cuisson sera régulière jusqu’au cœur.",
    dish: "Pavé de rumsteck, sauce au bleu et pommes sautées.",
    image: "/images/rumsteak.jpg",
    productIds: ["rumsteak", "brochette-filet-de-rumsteck"],
  },
  "aiguillette-baronne": {
    name: "Aiguillette baronne",
    summary:
      "Pièce de la hanche, sous le rumsteck, aux fibres longues et au goût marqué. Elle fait de très bons rôtis et se prête aussi aux cuissons longues.",
    texture: "Fibres longues, légèrement persillée.",
    flavor: "Goût prononcé.",
    bone: "Sans os.",
    cooking: [
      "Rôti : saisir, puis four à 180 °C, environ 15 min par 500 g pour rosé.",
      "Bœuf mode : morceaux de 5 cm mijotés à couvert 2 h 30 à 3 h.",
    ],
    tip: "En rôti, ficelez-la serrée pour une cuisson homogène ; une fine barde l’empêche de sécher.",
    dish: "Bœuf mode aux carottes.",
  },
  "tranche-grasse": {
    name: "Tranche grasse",
    summary:
      "Muscle de l’avant de la cuisse, au-dessus du genou. Maigre malgré son nom, il donne des steaks, des rôtis et des brochettes.",
    texture: "Grain assez fin, maigre.",
    flavor: "Goût doux.",
    bone: "Sans os.",
    cooking: [
      "Steak de 1,5 cm : poêle chaude, 1 min 30 à 2 min par face.",
      "Brochettes, rôti ou fondue.",
    ],
    tip: "Son nom vient de sa forme, pas de son gras : comme tous les morceaux maigres, servez-le saignant ou à point.",
    dish: "Brochettes de bœuf marinées au thym et poivrons grillés.",
  },
  gite: {
    name: "Gîte",
    label: "Gîte (avant, arrière)",
    summary:
      "Muscle des membres, à l’avant comme à l’arrière, traversé de tendons qui fondent à la cuisson. L’un des piliers du pot-au-feu.",
    texture: "Gélatineux, fondant après une cuisson longue.",
    flavor: "Goût profond, idéal pour les bouillons.",
    bone: "Sans os.",
    cooking: [
      "Pot-au-feu : départ à l’eau froide, frémissement 3 h à 3 h 30 pour des morceaux de 300 à 500 g.",
      "Daube, bourguignon : mijoté à couvert 2 h 30 à 3 h.",
    ],
    tip: "Associez les morceaux : gîte pour le moelleux, plat de côtes pour le gras, jarret pour le gélatineux. Le bouillon n’en sera que meilleur.",
    dish: "Pot-au-feu traditionnel et légumes du bouillon.",
  },
  jarret: {
    name: "Jarret",
    label: "Jarret (avant, arrière)",
    summary:
      "Le bas des membres, entouré de tendons. Avec son os à moelle, il apporte gélatine et onctuosité aux plats mijotés.",
    texture: "Très gélatineux, fondant après une cuisson longue.",
    flavor: "Goût intense.",
    bone: "Avec ou sans os ; l’os contient la moelle.",
    cooking: [
      "Pot-au-feu, potée : frémissement 3 h à 3 h 30.",
      "Braisé en tranches de 4 cm, à couvert, 2 h 30 environ.",
    ],
    tip: "Gardez l’os : la moelle sur une tranche de pain grillé, avec un peu de fleur de sel, est un régal.",
    dish: "Jarret de bœuf braisé aux carottes.",
    image: "/images/jarret.jpg",
    productIds: ["jarret"],
  },
  "faux-filet": {
    name: "Faux-filet",
    summary:
      "Le long de la colonne, entre la côte et le rumsteck, le faux-filet est une pièce noble, persillée et savoureuse : steaks généreux ou rôti d’exception.",
    texture: "Tendre, légèrement persillé, bordé d’une fine couche de gras.",
    flavor: "Goût riche, encore plus marqué après maturation.",
    bone: "Sans os.",
    cooking: [
      "Steak de 2,5 cm : poêle ou grill très chauds, 2 à 3 min par face pour saignant, puis 3 min de repos.",
      "Rôti : saisir, puis four à 200 °C, environ 15 min par 500 g pour rosé.",
    ],
    tip: "Entaillez légèrement le gras de bordure tous les 3 cm : la tranche ne se rétractera pas en cuisant.",
    dish: "Faux-filet grillé, beurre aux échalotes et frites.",
    image: "/images/faux-filet-mature.jpg",
    productIds: ["faux-filet-maturé"],
  },
  filet: {
    name: "Filet",
    summary:
      "Le muscle le moins sollicité de l’animal, donc le plus tendre. Le filet se prête aux cuissons courtes et aux préparations crues.",
    texture: "Extrêmement tendre, très maigre.",
    flavor: "Goût délicat.",
    bone: "Sans os.",
    cooking: [
      "Tournedos de 3 à 4 cm : poêle chaude, 2 à 3 min par face pour saignant, puis 5 min de repos.",
      "Filet entier d’environ 1 kg : saisir, puis four à 200 °C, 15 à 20 min pour un cœur rosé.",
      "Tartare et carpaccio.",
    ],
    tip: "Très maigre, il gagne à être arrosé de beurre mousseux pendant la cuisson ; ne dépassez pas « à point ».",
    dish: "Tournedos, sauce au poivre vert, ou filet en croûte pour les grandes occasions.",
    image: "/images/filet-de-bœuf.jpg",
    productIds: ["filet-de-bœuf"],
  },
  "bavette-aloyau": {
    name: "Bavette d’aloyau",
    summary:
      "Pièce du bas de l’aloyau, à longues fibres, très appréciée pour son goût. C’est la plus tendre des bavettes.",
    texture: "Fibres longues et lâches, tendre servie saignante.",
    flavor: "Goût prononcé, légèrement sucré.",
    bone: "Sans os.",
    cooking: [
      "Tranche de 1,5 cm : poêle ou grill très chauds, 1 à 2 min par face.",
      "Plancha ou barbecue sur braises vives.",
    ],
    tip: "Tranchez-la en biais, perpendiculairement aux fibres : c’est ce qui la rend tendre en bouche.",
    dish: "Bavette à l’échalote et pommes frites.",
  },
  onglet: {
    name: "Onglet",
    summary:
      "Petit muscle du diaphragme, recherché pour son goût puissant : un morceau de boucher par excellence.",
    texture: "Fibres longues, tendre saignant, ferme s’il est trop cuit.",
    flavor: "Goût intense, légèrement ferreux.",
    bone: "Sans os ; la membrane centrale est retirée au comptoir.",
    cooking: ["Pièce de 2 cm : poêle très chaude, 1 à 2 min par face, saignant ou bleu."],
    tip: "L’onglet se déguste saignant : au-delà, il durcit et perd son jus.",
    dish: "Onglet à l’échalote, déglacé au vinaigre de vin.",
  },
  hampe: {
    name: "Hampe",
    summary:
      "Muscle du diaphragme, voisin de l’onglet. Longue et plate, la hampe est juteuse et très goûteuse.",
    texture: "Fibres longues, juteuse.",
    flavor: "Goût prononcé.",
    bone: "Sans os.",
    cooking: [
      "Grill ou poêle très chauds : 1 à 2 min par face.",
      "Marinée puis grillée, tranchée en lanières.",
    ],
    tip: "Une marinade courte (huile, citron vert, épices, 1 h) lui va très bien ; tranchez-la contre les fibres au service.",
    dish: "Hampe grillée en fajitas, poivrons et oignons.",
  },
  "bavette-flanchet": {
    name: "Bavette de flanchet",
    summary:
      "Bavette du bas du ventre. Moins tendre que la bavette d’aloyau, elle est tout aussi savoureuse.",
    texture: "Fibres longues et marquées.",
    flavor: "Goût franc.",
    bone: "Sans os.",
    cooking: [
      "Tranche de 1 cm : poêle très chaude, 1 min par face.",
      "Émincée et sautée au wok, à feu très vif.",
      "En pot-au-feu ou braisée.",
    ],
    tip: "Pour un sauté, émincez-la en fines lanières contre le grain et saisissez-la en petites quantités.",
    dish: "Sauté de bœuf aux légumes au wok.",
  },
  flanchet: {
    name: "Flanchet",
    summary:
      "Morceau du bas du ventre, entrelardé et économique. Il apporte du moelleux aux mijotés et de la saveur à la viande hachée.",
    texture: "Alternance de muscle et de gras, fondante en cuisson longue.",
    flavor: "Goût riche.",
    bone: "Sans os.",
    cooking: ["Pot-au-feu, potée : frémissement 3 h environ.", "Haché pour les farces et les boulettes."],
    tip: "Associé à un morceau plus maigre, il rend farces et boulettes bien plus moelleuses.",
    dish: "Bouillon de bœuf aux légumes et vermicelles.",
  },
  "cotes-entrecotes": {
    name: "Côte et entrecôte",
    summary:
      "La côte de bœuf se tranche avec l’os ; l’entrecôte est la même noix de viande, sans os. Persillées et tendres, ce sont les reines des grillades.",
    texture: "Très persillée, tendre ; le noyau de gras fond à la cuisson.",
    flavor: "Goût riche et généreux, plus marqué après maturation.",
    bone: "Côte : avec os. Entrecôte : sans os.",
    cooking: [
      "Côte de 1 kg (environ 4 cm) : saisir 3 à 4 min par face, finir 10 à 15 min au four à 200 °C pour saignant, puis 10 min de repos.",
      "Entrecôte de 2,5 cm : poêle ou grill très chauds, 2 à 3 min par face.",
      "Barbecue : saisir sur les braises, terminer en zone sans braises pour les côtes épaisses.",
    ],
    tip: "Sortez la côte du réfrigérateur une heure avant. À table, découpez-la le long de l’os, puis en tranches épaisses.",
    dish: "Côte de bœuf au barbecue, sel fumé et légumes grillés.",
    image: "/images/cote-a-l-os.jpg",
    productIds: ["côte-à-l-os", "côte-à-l-os-maturé"],
  },
  "plat-de-cotes": {
    name: "Plat de côtes",
    summary:
      "Morceau de la cage thoracique avec os, entrelardé : la base des bons pot-au-feu, qui apporte gras et saveur au bouillon.",
    texture: "Entrelardé, avec des os plats ; fondant après une cuisson longue.",
    flavor: "Goût riche.",
    bone: "Avec os, ou désossé.",
    cooking: [
      "Pot-au-feu : frémissement 3 h à 3 h 30.",
      "Braisé à couvert, four à 150 °C, 3 h environ, puis laqué 15 min à four chaud.",
    ],
    tip: "Pour un plat de côtes laqué, cuisez-le d’abord doucement à couvert ; le laquage ne vient qu’à la fin.",
    dish: "Plat de côtes braisé à la bière, polenta crémeuse.",
    image: "/images/plat-de-cotes.jpg",
    productIds: ["plat-de-côtes"],
  },
  tendron: {
    name: "Tendron",
    summary:
      "Bas des côtes, entre le plat de côtes et la poitrine, riche en cartilages tendres. Un classique des plats mijotés.",
    texture: "Cartilagineux, moelleux après une cuisson longue.",
    flavor: "Goût fondant et généreux.",
    bone: "Avec cartilages.",
    cooking: ["Pot-au-feu, potée : frémissement 3 h environ.", "Braisé à couvert 2 h 30 à 3 h."],
    tip: "Plus il mijote doucement, plus les cartilages deviennent fondants : évitez l’ébullition franche.",
    dish: "Potée de bœuf au chou.",
  },
  "basses-cotes": {
    name: "Basses-côtes",
    summary:
      "Devant les côtes, sous le collier, les basses-côtes sont persillées et goûteuses. Elles se grillent comme elles se mijotent.",
    texture: "Persillée, avec quelques nerfs.",
    flavor: "Goût prononcé.",
    bone: "Avec ou sans os.",
    cooking: [
      "Tranche de 2 cm : poêle ou barbecue, 2 à 3 min par face.",
      "Bourguignon, daube : mijotée 2 h 30 à 3 h.",
      "Pot-au-feu.",
    ],
    tip: "En grillade, préférez saignant à à point et laissez reposer quelques minutes : le persillé restera juteux.",
    dish: "Bœuf bourguignon et pommes vapeur.",
    image: "/images/basse-cote.jpg",
    productIds: ["basse-côte"],
  },
  paleron: {
    name: "Paleron",
    summary:
      "Morceau de l’épaule traversé d’un nerf central gélatineux. Il fait merveille dans les plats mijotés.",
    texture: "Moelleux en cuisson longue ; le nerf central devient fondant.",
    flavor: "Goût riche.",
    bone: "Sans os.",
    cooking: [
      "Bourguignon, daube, pot-au-feu : morceaux de 5 cm mijotés à couvert 2 h 30 à 3 h.",
      "Steak de paleron, nerf retiré : poêle chaude, 2 min par face.",
    ],
    tip: "Ne retirez pas le nerf pour un plat mijoté : c’est lui qui donne l’onctuosité de la sauce.",
    dish: "Paleron braisé aux carottes.",
    image: "/images/paleron.jpg",
    productIds: ["paleron"],
  },
  griffe: {
    name: "Griffe",
    summary:
      "Petit morceau de l’épaule, gélatineux, qui doit son nom à sa forme. Il donne beaucoup de goût au pot-au-feu.",
    texture: "Gélatineux, fondant après une cuisson longue.",
    flavor: "Goût intense.",
    bone: "Sans os.",
    cooking: ["Pot-au-feu : frémissement 3 h environ.", "Daube ou braisé : 2 h 30 à 3 h à couvert."],
    tip: "Associez-la au gîte et au plat de côtes pour un pot-au-feu complet.",
    dish: "Pot-au-feu aux os à moelle.",
  },
  jumeau: {
    name: "Jumeau",
    summary:
      "Morceau de l’épaule, près du jarret, en deux parties : le jumeau à bifteck, tendre, et le jumeau à pot-au-feu, gélatineux.",
    texture: "Tendre (partie à bifteck) ou gélatineux (partie à pot-au-feu).",
    flavor: "Goût franc.",
    bone: "Sans os.",
    cooking: [
      "Jumeau à bifteck, steak de 1,5 cm : poêle chaude, 1 min 30 à 2 min par face.",
      "Jumeau à pot-au-feu : frémissement 3 h environ.",
    ],
    tip: "Dites-nous l’usage prévu au comptoir : nous vous servirons la bonne partie.",
    dish: "Bifteck de jumeau et purée maison.",
    image: "/images/jumeau.jpg",
    productIds: ["jumeau"],
  },
  macreuse: {
    name: "Macreuse",
    summary:
      "Morceau de l’épaule. La macreuse à bifteck, tendre et maigre, se poêle ; la macreuse à pot-au-feu, plus gélatineuse, se mijote.",
    texture: "Maigre et à grain fin (à bifteck), gélatineuse (à pot-au-feu).",
    flavor: "Goût doux.",
    bone: "Sans os.",
    cooking: [
      "À bifteck, steak de 1,5 cm : 1 min 30 à 2 min par face.",
      "À pot-au-feu ou en daube : 3 h à frémissement.",
    ],
    tip: "Taillée en dés, la macreuse à bifteck fait d’excellentes brochettes.",
    dish: "Daube provençale à l’orange.",
    image: "/images/macreuse.jpg",
    productIds: ["macreuse"],
  },
  poitrine: {
    name: "Poitrine",
    summary:
      "Le bas du thorax, à l’avant de l’animal : un morceau entrelardé et économique, parfait pour les cuissons longues.",
    texture: "Alternance de gras et de muscle, fondante.",
    flavor: "Goût riche.",
    bone: "Avec ou sans os (cartilages).",
    cooking: [
      "Pot-au-feu : frémissement 3 h à 3 h 30.",
      "Braisée lentement, à couvert, plusieurs heures à four doux (140 à 150 °C).",
    ],
    tip: "Cuite la veille et refroidie, la poitrine se tranche proprement et se réchauffe parfaitement.",
    dish: "Pot-au-feu à l’ancienne.",
  },
  collier: {
    name: "Collier",
    summary:
      "Le cou de l’animal, un muscle très travaillé : gélatineux et goûteux, idéal pour les mijotés et la viande hachée.",
    texture: "Gélatineux, fondant après une cuisson longue.",
    flavor: "Goût intense.",
    bone: "Avec ou sans os.",
    cooking: ["Bourguignon, daube, ragoût : mijoté à couvert 2 h 30 à 3 h.", "Haché pour sauces et farces."],
    tip: "Faites revenir les morceaux en plusieurs fois pour bien les colorer avant de mouiller : la sauce aura plus de goût.",
    dish: "Ragoût de collier aux légumes d’hiver.",
    image: "/images/collier-de-bœuf.jpg",
    productIds: ["collier-de-bœuf"],
  },
  "veine-grasse": {
    name: "Veine grasse",
    summary:
      "Morceau du cou, sous le collier, persillé et moelleux. Peu connu, il est très apprécié en cuisson longue.",
    texture: "Persillée, moelleuse.",
    flavor: "Goût généreux.",
    bone: "Sans os.",
    cooking: ["Bourguignon, daube : mijotée 2 h 30 à 3 h.", "Pot-au-feu."],
    tip: "Son persillé la garde moelleuse : parfaite pour un plat préparé la veille et réchauffé.",
    dish: "Bœuf carottes.",
  },
  joue: {
    name: "Joue",
    summary:
      "Muscle très travaillé qui devient incroyablement fondant après une longue cuisson. Un morceau d’initiés devenu un classique de bistrot.",
    texture: "Très gélatineuse, se défait à la fourchette.",
    flavor: "Goût profond.",
    bone: "Sans os.",
    cooking: [
      "Braisée à couvert, four à 150 °C, 3 h à 3 h 30 pour des joues entières.",
      "À l’autocuiseur, environ 1 h après la mise en pression.",
    ],
    tip: "Demandez-la parée : la membrane extérieure retirée, la sauce sera plus belle.",
    dish: "Joues de bœuf au vin rouge, purée de céleri.",
  },
};

const agneau: Record<string, Entry> = {
  gigot: {
    name: "Gigot",
    summary:
      "La cuisse de l’agneau, pièce de fête par excellence. Tendre et parfumé, le gigot se rôtit entier ou se détaille en tranches à griller.",
    texture: "Tendre, chair fine.",
    flavor: "Goût délicat de l’agneau.",
    bone: "Avec os (entier ou raccourci), ou désossé et roulé.",
    cooking: [
      "Gigot de 2 kg avec os : four à 180 °C, environ 15 min par 500 g pour rosé, puis 15 min de repos.",
      "Tranches de 1,5 cm : grill ou barbecue, 2 à 3 min par face.",
      "Gigot de sept heures : four à 120 °C, à couvert.",
    ],
    tip: "Piquez-le d’ail et laissez-le reposer sous une feuille d’aluminium avant de le trancher : le jus restera dans la viande.",
    dish: "Gigot rôti à l’ail et flageolets.",
    image: "/images/gigot.jpg",
    productIds: ["gigot"],
  },
  souris: {
    name: "Souris",
    summary:
      "Le bas du gigot, autour de l’os. Riche en tendons, la souris devient fondante et se détache de l’os après une cuisson douce.",
    texture: "Gélatineuse, fondante.",
    flavor: "Goût prononcé.",
    bone: "Avec os.",
    cooking: ["Confite ou braisée à couvert, four à 150 °C, 2 h 30 à 3 h pour des souris de 300 à 400 g."],
    tip: "Comptez une souris par personne et arrosez-la régulièrement de son jus.",
    dish: "Souris d’agneau confites au miel et au thym.",
    image: "/images/souris.jpg",
    productIds: ["souris"],
  },
  selle: {
    name: "Selle",
    summary:
      "La selle réunit les deux côtés de la longe, entre le gigot et les côtes-filets. Une pièce délicate, rôtie entière ou détaillée en noisettes.",
    texture: "Très tendre.",
    flavor: "Fine et parfumée.",
    bone: "Avec os, ou désossée et roulée.",
    cooking: [
      "Selle d’environ 1 kg : four à 200 °C, 20 à 25 min pour rosé.",
      "Noisettes de 2 cm : poêle chaude, 2 min par face.",
    ],
    tip: "Désossée et roulée autour d’herbes fraîches, elle se tranche facilement à table.",
    dish: "Selle d’agneau rôtie aux herbes et petits légumes.",
  },
  filet: {
    name: "Filet et côtes-filets",
    summary:
      "Entre la selle et le carré, le filet donne les côtes-filets, charnues et sans os apparent, très appréciées au grill.",
    texture: "Tendre, bordé d’une fine couche de gras.",
    flavor: "Goût fin.",
    bone: "Côtes-filets : petit os ; filet : sans os.",
    cooking: [
      "Côtes-filets de 2 cm : grill ou poêle, 2 à 3 min par face.",
      "Filet désossé : saisir, puis four à 200 °C, 8 à 10 min.",
    ],
    tip: "Gardez le gras de bordure pendant la cuisson : il protège et parfume la viande. Retirez-le à table si vous préférez.",
    dish: "Côtes-filets grillées et tian de légumes.",
  },
  carre: {
    name: "Carré",
    label: "Carré (côtes premières et secondes)",
    summary:
      "Le carré réunit les côtes premières et secondes. Rôti entier ou détaillé en côtelettes, c’est l’un des morceaux les plus élégants de l’agneau.",
    texture: "Très tendre, légèrement gras.",
    flavor: "Goût délicat.",
    bone: "Avec os ; manchonné sur demande.",
    cooking: [
      "Carré de 8 côtes : saisir, puis four à 200 °C, 15 à 20 min pour rosé, puis 5 min de repos.",
      "Côtelettes : grill ou poêle très chauds, 1 à 2 min par face.",
    ],
    tip: "Demandez-le manchonné, os dégagés : la présentation est plus belle et les os ne brûlent pas.",
    dish: "Carré d’agneau en croûte d’herbes.",
    image: "/images/cote-d-agneau.jpg",
    productIds: ["côte-d-agneau"],
  },
  "cotes-decouvertes": {
    name: "Côtes découvertes",
    summary:
      "En avant du carré, au-dessus de l’épaule. Plus persillées, les côtes découvertes sont savoureuses et plus économiques.",
    texture: "Persillées, un peu plus fermes que les côtes premières.",
    flavor: "Goût prononcé.",
    bone: "Avec os.",
    cooking: [
      "Côtes de 1,5 cm : grill ou barbecue, 2 à 3 min par face.",
      "En navarin, mijotées 1 h 30.",
    ],
    tip: "Une heure de marinade huile d’olive, ail et romarin avant le barbecue leur va parfaitement.",
    dish: "Côtes d’agneau au barbecue et semoule aux herbes.",
  },
  collier: {
    name: "Collier",
    summary: "Le cou de l’agneau, gélatineux et savoureux : le morceau idéal des navarins et des tajines.",
    texture: "Gélatineux, fondant après une cuisson longue.",
    flavor: "Goût prononcé.",
    bone: "Avec os, en tranches.",
    cooking: ["Navarin, tajine : mijoté à couvert 1 h 30 à 2 h.", "Couscous : dans le bouillon, 1 h 30 environ."],
    tip: "Faites dorer les tranches avant de les mijoter et dégraissez la sauce en fin de cuisson.",
    dish: "Navarin d’agneau aux légumes nouveaux.",
    image: "/images/collier.jpg",
    productIds: ["collier"],
  },
  epaule: {
    name: "Épaule",
    summary:
      "Plus persillée que le gigot, l’épaule est moelleuse et très goûteuse. Elle se rôtit, se confit ou se mijote.",
    texture: "Moelleuse, persillée.",
    flavor: "Goût plus prononcé que le gigot.",
    bone: "Avec os, ou désossée et roulée.",
    cooking: [
      "Rôtie : four à 180 °C, environ 15 min par 500 g pour rosé.",
      "Confite : four à 140 °C, 4 à 5 h à couvert pour une épaule de 1,5 kg.",
      "En morceaux pour tajine ou curry : 1 h 30 à 2 h.",
    ],
    tip: "Une épaule confite se détache à la cuillère : idéale pour recevoir, sans surveillance.",
    dish: "Épaule d’agneau confite aux épices douces.",
    image: "/images/epaule.jpg",
    productIds: ["épaule", "tranche-d-épaule-marinée"],
  },
  poitrine: {
    name: "Poitrine",
    summary:
      "Entrelardée, la poitrine d’agneau se déguste confite, grillée ou farcie. Un morceau économique et plein de saveur.",
    texture: "Entrelardée, fondante après une cuisson longue.",
    flavor: "Goût riche.",
    bone: "Avec os (côtes plates), ou désossée.",
    cooking: [
      "Farcie et rôtie : four à 160 °C, 1 h 30 à 2 h.",
      "Précuite doucement à couvert, puis grillée.",
    ],
    tip: "Une précuisson à couvert suivie d’un passage sous le grill donne une poitrine fondante et croustillante.",
    dish: "Poitrine d’agneau farcie aux herbes.",
    image: "/images/poitrine.jpg",
    productIds: ["poitrine"],
  },
  jarret: {
    name: "Jarret",
    summary: "Le bas de l’épaule. Riche en tendons, le jarret d’agneau se confit lentement jusqu’à se détacher de l’os.",
    texture: "Gélatineux, fondant.",
    flavor: "Goût prononcé.",
    bone: "Avec os.",
    cooking: ["Braisé ou confit à couvert, four à 150 °C, 2 h 30 environ."],
    tip: "Comme la souris, prévoyez un jarret par personne et une cuisson douce.",
    dish: "Jarret d’agneau aux pois chiches.",
  },
};

const veau: Record<string, Entry> = {
  quasi: {
    name: "Quasi",
    summary:
      "En haut de la cuisse, sous la longe, le quasi est tendre et savoureux : il donne l’un des meilleurs rôtis de veau.",
    texture: "Tendre, grain fin.",
    flavor: "Goût délicat.",
    bone: "Sans os.",
    cooking: [
      "Rôti de 1 kg : saisir, puis four à 170 °C, 50 min à 1 h pour un cœur rosé.",
      "Pavés de 3 cm : poêle à feu moyen, 3 à 4 min par face.",
    ],
    tip: "Le veau aime les cuissons modérées : arrosez souvent le rôti de son beurre pour qu’il reste moelleux.",
    dish: "Rôti de quasi aux champignons.",
    image: "/images/quasi-de-veau.jpg",
    productIds: ["quasi-de-veau"],
  },
  "sous-noix": {
    name: "Sous-noix",
    summary: "Muscle extérieur de la cuisse : la sous-noix donne des escalopes et des rôtis un peu plus fermes que la noix.",
    texture: "Grain plus serré que la noix.",
    flavor: "Goût fin.",
    bone: "Sans os.",
    cooking: ["Escalopes de 5 mm : poêle, 1 à 2 min par face.", "Rôti : four à 170 °C, environ 25 min par 500 g."],
    tip: "Aplatissez légèrement les escalopes au rouleau pour qu’elles cuisent uniformément.",
    dish: "Escalopes panées à la milanaise.",
  },
  noix: {
    name: "Noix",
    summary: "Au cœur de la cuisse, la noix est le morceau de choix des escalopes. Elle donne aussi un très beau rôti.",
    texture: "Très tendre, grain fin, maigre.",
    flavor: "Goût délicat.",
    bone: "Sans os.",
    cooking: ["Escalopes de 5 mm : poêle au beurre, 1 à 2 min par face.", "Rôti : saisir, puis four à 170 °C, environ 25 min par 500 g."],
    tip: "Ne piquez pas les escalopes et salez-les en fin de cuisson pour garder tout leur jus.",
    dish: "Escalope de veau à la crème et aux champignons.",
    productIds: ["escalope-de-veau"],
  },
  "noix-patissiere": {
    name: "Noix pâtissière",
    summary: "À l’avant de la cuisse, ce morceau maigre et tendre donne des rôtis, des escalopes et des brochettes.",
    texture: "Tendre, maigre.",
    flavor: "Goût doux.",
    bone: "Sans os.",
    cooking: ["Rôti : four à 170 °C, environ 25 min par 500 g.", "Brochettes : grill, 8 à 10 min en les retournant."],
    tip: "Pour des brochettes moelleuses, alternez avec des légumes et badigeonnez d’huile d’olive.",
    dish: "Brochettes de veau au citron et au romarin.",
  },
  filet: {
    name: "Filet et longe",
    summary:
      "Le long de la colonne, entre le carré et le quasi : on y taille le filet, la longe et les côtes-filets, des pièces fines et tendres.",
    texture: "Très tendre, maigre.",
    flavor: "Fin.",
    bone: "Côtes-filets avec os ; filet et longe désossés.",
    cooking: [
      "Médaillons de 3 cm : poêle à feu moyen, 3 à 4 min par face.",
      "Filet ou longe en rôti : four à 170 °C, environ 25 min par 500 g.",
    ],
    tip: "Cuisez le veau à feu moyen : trop vif, il sèche en surface avant d’être cuit au cœur.",
    dish: "Médaillons de veau, sauce aux morilles.",
    image: "/images/filet-de-veau.jpg",
    productIds: ["filet-de-veau"],
  },
  carre: {
    name: "Carré",
    label: "Carré (côtes et entrecôte)",
    summary:
      "Le carré donne les côtes de veau, épaisses et tendres, et l’entrecôte de veau lorsqu’il est désossé.",
    texture: "Tendre, légèrement persillé.",
    flavor: "Goût fin.",
    bone: "Côtes : avec os ; entrecôte : sans os.",
    cooking: [
      "Côte de 3 cm : poêle à feu moyen, 5 à 6 min par face, puis 5 min de repos.",
      "Carré rôti : four à 170 °C, environ 25 min par 500 g.",
    ],
    tip: "Faites-la dorer au beurre et arrosez-la souvent : la côte de veau doit rester rosée et juteuse.",
    dish: "Côte de veau, jus au thym et gratin dauphinois.",
    image: "/images/entrecote-de-veau.jpg",
    productIds: ["entrecôte-de-veau"],
  },
  "cotes-decouvertes": {
    name: "Côtes découvertes",
    summary: "En avant du carré, ces côtes un peu moins tendres restent savoureuses et se prêtent bien aux sautés.",
    texture: "Plus fermes que le carré.",
    flavor: "Goût prononcé.",
    bone: "Avec os.",
    cooking: ["Côtes de 2 cm : poêle à feu moyen, 4 à 5 min par face.", "En sauté : 1 h à 1 h 30 à couvert."],
    tip: "Saisissez-les, puis terminez à couvert et à feu doux avec un fond de vin blanc.",
    dish: "Sauté de veau aux olives.",
  },
  collier: {
    name: "Collier",
    summary: "Gélatineux, le collier de veau est l’un des morceaux traditionnels de la blanquette et du sauté.",
    texture: "Gélatineux, moelleux.",
    flavor: "Goût doux.",
    bone: "Avec ou sans os.",
    cooking: ["Blanquette, sauté : mijoté à couvert 1 h 30 à 2 h."],
    tip: "Pour la blanquette, mélangez collier et tendron : le bouillon sera plus onctueux.",
    dish: "Blanquette de veau à l’ancienne.",
    image: "/images/collier-de-veau.jpg",
    productIds: ["collier-de-veau"],
  },
  epaule: {
    name: "Épaule",
    summary: "Maigre et goûteuse, l’épaule de veau se cuisine en rôti, en sauté ou en paupiettes.",
    texture: "Maigre, moelleuse en cuisson douce.",
    flavor: "Goût fin.",
    bone: "Désossée.",
    cooking: ["Rôti : four à 160 °C, environ 30 min par 500 g.", "Sauté : 1 h 30 à couvert."],
    tip: "En rôti, une fine barde l’empêche de sécher.",
    dish: "Sauté de veau Marengo.",
  },
  "bas-de-carre": {
    name: "Bas de carré",
    summary: "Sous les côtes, le bas de carré se prépare surtout en sauté et en blanquette.",
    texture: "Moelleux, avec un peu de gras.",
    flavor: "Goût doux.",
    bone: "Avec ou sans os.",
    cooking: ["Blanquette, sauté : 1 h 30 à couvert."],
    tip: "Coupé en morceaux réguliers, il cuit en même temps que le collier et le tendron.",
    dish: "Blanquette aux champignons de Paris.",
  },
  tendron: {
    name: "Tendron",
    summary: "Riche en cartilages, le tendron devient fondant et onctueux : un incontournable de la blanquette.",
    texture: "Cartilagineux, fondant.",
    flavor: "Goût doux.",
    bone: "Avec cartilages.",
    cooking: ["Blanquette, sauté : 1 h 30 à 2 h à couvert.", "Grillé après une précuisson douce."],
    tip: "Cuisez-le à frémissement : il garde sa forme tout en devenant fondant.",
    dish: "Tendrons de veau aux carottes.",
  },
  poitrine: {
    name: "Poitrine",
    summary: "Entrelardée, la poitrine de veau se farcit, se roule ou se mijote : un morceau économique et généreux.",
    texture: "Entrelardée, moelleuse.",
    flavor: "Goût doux.",
    bone: "Avec ou sans os.",
    cooking: ["Farcie et rôtie : four à 160 °C, 2 h environ pour 1,5 kg.", "Blanquette ou sauté."],
    tip: "Demandez-la ouverte en portefeuille : elle se farcit plus facilement.",
    dish: "Poitrine de veau farcie aux herbes.",
    image: "/images/poitrine-de-veau.jpg",
    productIds: ["poitrine-de-veau"],
  },
  flanchet: {
    name: "Flanchet",
    summary: "Morceau du ventre, le flanchet sert en blanquette, en farce ou en viande hachée.",
    texture: "Moelleux, un peu gras.",
    flavor: "Goût doux.",
    bone: "Sans os.",
    cooking: ["Blanquette, mijoté : 1 h 30.", "Haché pour les farces."],
    tip: "Associé à l’épaule, il donne une farce moelleuse pour les légumes farcis.",
    dish: "Tomates farcies au veau.",
  },
  jarret: {
    name: "Jarret",
    label: "Jarret (avant, arrière)",
    summary: "Avant ou arrière, tranché avec son os à moelle, le jarret de veau est la pièce de l’osso buco.",
    texture: "Gélatineux, fondant.",
    flavor: "Goût riche.",
    bone: "Avec os à moelle.",
    cooking: ["Osso buco : tranches de 3 à 4 cm mijotées à couvert 1 h 30 à 2 h.", "Pot-au-feu de veau."],
    tip: "Entaillez la peau autour des tranches : elles ne se recroquevilleront pas à la cuisson.",
    dish: "Osso buco à la milanaise.",
    image: "/images/jarret-de-veau.jpg",
    productIds: ["jarret-de-veau"],
  },
};

const all: Record<AnimalId, Record<string, Entry>> = { boeuf, agneau, veau };

/** Fiche par défaut d'un morceau (avant les modifications faites dans l'app). */
export function cutContent(animal: AnimalId, id: string): CutContent {
  const e = all[animal][id];
  return { image: "", productIds: [], ...e };
}

export const cutKey = (animal: AnimalId, id: string) => `${animal}:${id}`;
