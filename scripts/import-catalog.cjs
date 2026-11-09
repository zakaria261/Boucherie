const fs = require("fs");
const source = fs.readFileSync(
  process.argv[2] || "/tmp/boucherie-products.html",
  "utf8",
);
const decode = (s) =>
  s
    .replaceAll("&#x27;", "'")
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"');
let category = "Volailles";
const products = [];
for (const chunk of source.split('data-slug="').slice(1)) {
  const id = chunk.split('"')[0];
  const name = chunk.match(/data-hook="product-item-name">([^<]+)/)?.[1];
  const price = chunk.match(/data-wix-price="([\d,]+)/)?.[1];
  const image = chunk.match(
    /https:\/\/static.wixstatic.com\/media\/([^/" ]+)/,
  )?.[1];
  if (!name || !price || !image || products.some((p) => p.id === id)) continue;
  if (id === "brochette-filet-de-rumsteck") category = "Bœuf";
  if (id === "brochette-de-veau-légume") category = "Veau";
  if (id === "tranche-d-épaule-marinée") category = "Agneau";
  products.push({
    id,
    name: decode(name).charAt(0).toUpperCase() + decode(name).slice(1),
    price: Math.round(Number(price.replace(",", ".")) * 100),
    category,
    image: `https://static.wixstatic.com/media/${image}/v1/fill/w_700,h_600,al_c,q_85/${image}`,
    grill: /brochette|merguez|saucisse|chipolata|mariné/i.test(name),
  });
}
fs.writeFileSync("lib/products.json", JSON.stringify(products, null, 2) + "\n");
console.log(
  products.length,
  products.map((p) => `${p.category}: ${p.name}`).join("\n"),
);
