// Cartes des découpes (bœuf, agneau, veau) : silhouettes vectorielles et zones
// de découpe selon la découpe bouchère française. Animal de profil, tête à
// droite. Chaque zone est découpée par la silhouette (clipPath) : les
// polygones peuvent déborder, seul l'intérieur du corps est visible.
// Les zones de morceaux internes (filet, onglet, hampe, tende de tranche…)
// sont représentées à leur emplacement approximatif, de façon pédagogique.

export type AnimalId = "boeuf" | "agneau" | "veau";

export type CutShape = {
  id: string;
  /** Polygones (points SVG) de la zone ; plusieurs pour un morceau en deux parties. */
  shapes: string[];
  /** Zone hors silhouette (queue) : non découpée par le contour. */
  free?: boolean;
  /** Point d'attache de la légende, si le centre du polygone tombe hors du corps. */
  at?: [number, number];
};

export type AnimalMap = {
  id: AnimalId;
  name: string;
  /** Article pour les phrases : « du bœuf », « de l’agneau ». */
  of: string;
  /** Contour du corps (sert aussi de découpe des zones). */
  body: string;
  /** Pattes du côté opposé, dessinées en retrait. */
  farLegs: string[];
  /** Détails dessinés au trait : cornes, oreille, œil, sabots. */
  details: string[];
  /** Formes pleines au premier plan (oreille). */
  fills?: string[];
  eye: [number, number];
  cuts: CutShape[];
};

/* ——— Bœuf : adulte massif, poitrail profond, fanon, cornes, queue à toupet ——— */
const boeuf: AnimalMap = {
  id: "boeuf",
  name: "Bœuf",
  of: "du bœuf",
  body:
    "M175 152 C200 138 230 132 262 134 C340 140 420 146 520 146 C620 146 700 138 760 124 C800 116 836 124 862 138 C880 147 896 150 908 148 C940 146 966 164 980 194 C992 222 1000 254 1004 280 C1007 300 998 316 980 318 C960 320 942 316 930 306 C918 296 906 282 896 278 C880 292 866 320 856 350 C848 376 840 400 830 420 C826 446 824 470 824 492 L822 546 L826 562 L836 576 L796 576 L798 560 L796 500 C794 480 788 456 774 438 C740 448 690 456 620 458 C540 460 470 452 420 440 C404 452 396 474 392 498 L386 548 L390 562 L398 576 L356 576 L356 560 L354 528 C350 508 344 494 336 484 C310 458 262 410 228 360 C200 318 182 260 176 210 Z",
  farLegs: [
    "M760 446 L784 446 C786 470 786 500 784 520 L782 548 L786 562 L794 576 L756 576 L758 560 L758 520 C758 500 758 470 760 446 Z",
    "M404 452 L428 446 C424 470 418 500 414 530 L412 548 L416 562 L424 576 L384 576 L386 560 L388 528 C392 500 398 474 404 452 Z",
  ],
  details: [
    "M902 148 C888 128 892 104 914 92 C906 110 908 128 918 146",
    "M922 156 C946 136 976 136 992 146 C976 162 952 168 932 164",
    "M992 282 C998 288 998 296 992 300",
    "M940 306 C952 311 966 311 978 308",
    "M796 562 L826 562",
    "M356 562 L390 562",
  ],
  eye: [952, 200],
  cuts: [
    { id: "queue", free: true, shapes: ["172,156 184,162 174,240 170,330 170,440 174,470 166,494 150,494 152,470 158,440 158,330 162,240"] },
    { id: "poire-merlan", shapes: ["160,130 240,126 240,196 210,206 160,212"] },
    { id: "rond-de-gite", shapes: ["160,212 210,206 240,196 240,300 170,300"] },
    { id: "gite-a-la-noix", at: [214, 350], shapes: ["170,300 240,300 252,380 276,430 222,410 190,356"] },
    { id: "tende-de-tranche", shapes: ["240,262 286,262 296,330 304,384 252,380 240,300"] },
    { id: "rumsteck", shapes: ["240,110 350,110 350,262 240,262"] },
    { id: "aiguillette-baronne", shapes: ["286,262 350,262 350,330 296,330"] },
    { id: "tranche-grasse", at: [338, 392], shapes: ["296,330 350,330 404,420 430,470 360,486 326,446 304,384"] },
    { id: "gite", shapes: ["252,380 304,384 326,446 350,486 324,500 276,430", "776,436 832,428 828,498 794,498"] },
    { id: "jarret", shapes: ["324,500 350,486 422,466 404,548 350,548", "794,498 828,498 826,548 796,548"] },
    { id: "faux-filet", shapes: ["350,105 495,105 495,232 350,232"] },
    { id: "filet", shapes: ["350,232 495,232 495,268 350,268"] },
    { id: "bavette-aloyau", shapes: ["350,268 445,268 445,330 350,330"] },
    { id: "onglet", shapes: ["445,268 495,268 495,302 445,302"] },
    { id: "hampe", shapes: ["445,302 495,302 495,344 445,344"] },
    { id: "bavette-flanchet", shapes: ["350,330 445,330 445,344 495,344 495,394 380,394"] },
    { id: "flanchet", shapes: ["380,394 495,394 495,470 404,470"] },
    { id: "cotes-entrecotes", shapes: ["495,100 630,100 630,268 495,268"] },
    { id: "plat-de-cotes", shapes: ["495,268 630,268 630,326 715,326 715,394 495,394"] },
    { id: "tendron", shapes: ["495,394 630,394 630,470 495,470"] },
    { id: "basses-cotes", shapes: ["630,100 760,100 760,250 630,250"] },
    { id: "paleron", shapes: ["630,250 760,250 786,292 780,326 630,326"] },
    { id: "griffe", shapes: ["715,326 780,326 780,370 715,370"] },
    { id: "jumeau", shapes: ["715,370 780,370 776,440 715,448"] },
    { id: "macreuse", shapes: ["780,292 868,326 852,394 780,394"] },
    { id: "poitrine", shapes: ["630,394 715,394 715,470 630,470", "780,394 852,394 834,432 776,440"] },
    { id: "collier", shapes: ["760,90 912,90 912,276 868,326 786,292 760,250"] },
    { id: "veine-grasse", at: [872, 322], shapes: ["868,326 912,276 914,296 876,352 852,394"] },
    { id: "joue", shapes: ["926,232 1000,232 1006,282 936,288"] },
  ],
};

/* ——— Agneau : compact, toison festonnée, petite tête, pattes fines et hautes ——— */
const agneau: AnimalMap = {
  id: "agneau",
  name: "Agneau",
  of: "de l’agneau",
  body:
    "M248 205 C262 182 290 170 320 170 C340 158 362 158 380 168 C398 156 420 156 438 166 C456 154 478 154 496 164 C514 152 536 152 554 162 C572 150 594 150 612 160 C630 148 652 148 670 158 C688 146 710 146 728 156 C748 140 770 130 792 124 C812 118 830 120 846 128 C872 132 896 150 912 178 C926 204 934 232 932 250 C930 264 918 270 904 268 C888 266 874 258 864 248 C852 262 840 282 830 302 C822 330 812 360 800 386 C796 400 792 410 790 420 L788 500 L790 560 L796 576 L768 576 L768 560 L766 500 L764 430 C740 426 700 430 660 432 C600 436 520 436 460 430 C430 428 410 424 396 420 C392 440 390 460 388 480 L384 540 L386 562 L392 576 L364 576 L364 560 L362 520 C358 500 352 486 344 476 C320 452 290 420 268 380 C250 344 240 300 238 260 C238 236 240 218 248 205 Z",
  farLegs: [
    "M742 430 L762 430 L764 500 L764 560 L770 576 L742 576 L742 560 L740 500 Z",
    "M402 424 L420 424 L414 490 L410 560 L416 576 L388 576 L390 560 L394 490 Z",
  ],
  details: [
    "M926 240 C930 244 930 248 926 252",
    "M904 262 C896 264 888 262 882 258",
    "M250 210 C236 214 226 228 226 246 C236 242 246 232 254 224",
    "M766 470 L790 470",
    "M362 470 L388 470",
    "M768 562 L792 562",
    "M364 562 L388 562",
  ],
  fills: ["M850 136 C826 134 800 142 782 160 C800 170 830 166 852 152 Z"],
  eye: [880, 178],
  cuts: [
    { id: "gigot", shapes: ["200,140 380,140 380,300 396,420 300,436 236,340"] },
    { id: "souris", shapes: ["300,436 396,420 390,500 340,492"] },
    { id: "selle", shapes: ["380,140 470,140 470,282 380,282"] },
    { id: "filet", shapes: ["470,140 545,140 545,282 470,282"] },
    { id: "carre", shapes: ["545,140 660,140 660,282 545,282"] },
    { id: "cotes-decouvertes", shapes: ["660,130 740,130 740,282 660,282"] },
    { id: "collier", shapes: ["740,100 862,100 862,250 830,302 770,300 740,282"] },
    { id: "epaule", shapes: ["660,282 740,282 770,300 830,302 806,400 790,470 766,470 764,432 660,440"] },
    { id: "poitrine", shapes: ["380,282 660,282 660,440 396,440"] },
    { id: "jarret", shapes: ["766,470 790,470 790,540 768,540"] },
  ],
};

/* ——— Veau : jeune bovin, corps léger, grosse tête, larges oreilles, pattes longues ——— */
const veau: AnimalMap = {
  id: "veau",
  name: "Veau",
  of: "du veau",
  body:
    "M210 175 C236 160 266 156 300 158 C380 162 460 164 560 164 C650 164 720 160 770 152 C800 148 826 152 848 160 C864 166 880 168 894 166 C930 164 958 184 972 214 C984 242 992 272 994 296 C996 314 986 326 968 328 C948 330 930 324 918 314 C906 304 896 294 886 290 C870 304 856 330 846 358 C838 382 830 402 822 418 C818 440 816 462 816 484 L814 548 L818 562 L826 576 L790 576 L792 560 L790 500 C788 478 782 456 770 440 C730 448 680 452 610 452 C530 452 470 446 420 436 C404 448 398 470 394 494 L388 548 L392 562 L400 576 L362 576 L362 560 L360 530 C356 510 350 496 342 486 C316 460 270 414 240 366 C214 324 202 270 204 220 C204 200 206 186 210 175 Z",
  farLegs: [
    "M762 446 L784 446 C786 470 786 500 784 520 L782 548 L786 562 L794 576 L756 576 L758 560 L758 520 C758 500 758 470 762 446 Z",
    "M404 446 L428 440 C424 466 418 496 414 528 L412 548 L416 562 L424 576 L384 576 L386 560 L388 528 C392 500 398 472 404 446 Z",
  ],
  details: [
    "M918 172 C942 150 974 146 994 156 C976 174 950 182 928 184",
    "M902 168 C898 158 902 150 910 148",
    "M986 298 C991 303 991 309 986 313",
    "M934 318 C946 322 958 322 970 320",
    "M212 182 C198 214 192 270 194 350 C195 380 192 400 186 416",
    "M790 562 L818 562",
    "M362 562 L392 562",
  ],
  eye: [946, 214],
  cuts: [
    { id: "quasi", shapes: ["250,140 350,140 350,250 260,250 250,200"] },
    { id: "sous-noix", shapes: ["190,170 250,165 260,250 262,330 196,330"] },
    { id: "noix", shapes: ["196,330 262,330 260,250 304,250 304,390 266,420 226,370"] },
    { id: "noix-patissiere", shapes: ["304,250 350,250 350,320 410,436 342,448 304,390"] },
    { id: "filet", shapes: ["350,140 475,140 475,262 350,262"] },
    { id: "flanchet", shapes: ["350,262 475,262 475,452 410,452 350,320"] },
    { id: "carre", shapes: ["475,140 615,140 615,262 475,262"] },
    { id: "cotes-decouvertes", shapes: ["615,140 720,140 720,262 615,262"] },
    { id: "bas-de-carre", shapes: ["475,262 605,262 605,330 475,330"] },
    { id: "tendron", shapes: ["475,330 595,330 595,460 475,460"] },
    { id: "collier", shapes: ["720,120 900,120 900,286 850,346 776,304 720,262"] },
    { id: "epaule", shapes: ["605,262 720,262 776,304 850,346 838,410 776,440 700,430 605,330"] },
    { id: "poitrine", shapes: ["595,330 605,330 700,430 776,440 770,470 595,470"] },
    { id: "jarret", shapes: ["266,420 304,390 342,448 410,436 396,520 352,520 340,486", "776,440 838,410 822,520 790,520"] },
  ],
};

export const animalMaps: AnimalMap[] = [boeuf, agneau, veau];

/** Cadre de la carte : silhouette au centre, légendes au-dessus et au-dessous. */
export const VIEW = { x: 80, y: 0, width: 950, height: 680 };
const ROW_GAP = 26;
/** Rangée la plus proche de l'animal, en haut et en bas ; les suivantes s'en éloignent. */
const TOP_ROWS_Y = 62;
const BOTTOM_ROWS_Y = 604;

/** Centre approximatif d'une zone (moyenne des sommets du premier polygone). */
export function anchorOf(cut: CutShape): [number, number] {
  if (cut.at) return cut.at;
  const points = cut.shapes[0].split(" ").map((p) => p.split(",").map(Number));
  const x = points.reduce((s, p) => s + p[0], 0) / points.length;
  const y = points.reduce((s, p) => s + p[1], 0) / points.length;
  return [Math.round(x), Math.round(y)];
}

export type LabelBox = { id: string; text: string; x: number; y: number; width: number; anchor: [number, number]; top: boolean };

/**
 * Légendes reliées à leur zone : morceaux du haut au-dessus de l'animal, du
 * bas au-dessous, sur plusieurs rangées. Chaque rangée est répartie de gauche
 * à droite sans chevauchement (largeur estimée du texte + marge).
 */
export function layoutLabels(map: AnimalMap, names: Record<string, string>): LabelBox[] {
  const width = (text: string) => Math.round(text.length * 6.6 + 14);
  const min = VIEW.x + 6;
  const max = VIEW.x + VIEW.width - 6;
  const items = map.cuts.map((c) => {
    const anchor = anchorOf(c);
    return { id: c.id, text: names[c.id] || c.id, anchor, width: width(names[c.id] || c.id), top: anchor[1] < 285 };
  });
  const result: LabelBox[] = [];
  for (const top of [true, false]) {
    const group = items.filter((i) => i.top === top).sort((a, b) => a.anchor[0] - b.anchor[0]);
    const total = group.reduce((s, i) => s + i.width + 8, 0);
    const rows = Math.max(2, Math.ceil((total * 1.25) / (max - min)));
    for (let r = 0; r < rows; r++) {
      const row = group.filter((_, n) => n % rows === r);
      const y = top ? TOP_ROWS_Y - r * ROW_GAP : BOTTOM_ROWS_Y + r * ROW_GAP;
      // Placement gauche → droite, puis recalage si la rangée dépasse.
      const xs: number[] = [];
      row.forEach((item, n) => {
        const desired = Math.min(Math.max(item.anchor[0], min + item.width / 2), max - item.width / 2);
        const previous = n ? xs[n - 1] + row[n - 1].width / 2 + 8 + item.width / 2 : -Infinity;
        xs.push(Math.max(desired, previous));
      });
      for (let n = row.length - 1; n >= 0; n--) {
        const limit = n === row.length - 1 ? max - row[n].width / 2 : xs[n + 1] - row[n + 1].width / 2 - 8 - row[n].width / 2;
        xs[n] = Math.min(xs[n], limit);
      }
      row.forEach((item, n) => result.push({ ...item, x: Math.round(xs[n]), y }));
    }
  }
  return result;
}

/** Contrôle : deux légendes d'une même rangée ne se chevauchent jamais. */
export function overlaps(labels: LabelBox[]) {
  const issues: string[] = [];
  for (const a of labels)
    for (const b of labels)
      if (a !== b && a.y === b.y && a.x < b.x && a.x + a.width / 2 + 2 > b.x - b.width / 2) issues.push(`${a.id} / ${b.id}`);
  return issues;
}

/** Cadre ajusté aux légendes (aucune ne sort de l'image). */
export function viewBoxFor(labels: LabelBox[]) {
  const ys = labels.map((l) => l.y);
  const top = Math.min(80, ...ys) - 22;
  const bottom = Math.max(586, ...ys) + 12;
  return `${VIEW.x} ${top} ${VIEW.width} ${bottom - top}`;
}
