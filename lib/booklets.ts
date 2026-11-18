// Livrets de la boucherie, à feuilleter sur le site. Les pages sont des
// images générées depuis les PDF d'origine (public/catalogues), le PDF allégé
// reste téléchargeable.
const pages = (folder: string, count: number) =>
  Array.from({ length: count }, (_, i) => `/catalogues/${folder}/${String(i + 1).padStart(2, "0")}.webp`);

export const festiveBooklet = {
  title: "Catalogue des fêtes 2026",
  pages: pages("fetes-2026", 29),
  pdf: "/catalogues/catalogue-fetes-2026.pdf",
};

export const marinadeBooklet = {
  title: "Nos marinades",
  pages: pages("marinades", 3),
  pdf: "/catalogues/marinades.pdf",
};
