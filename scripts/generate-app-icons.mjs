// Génère les icônes de l'application Faubourg Pro à partir de scripts/app-icon.svg.
// Usage : node scripts/generate-app-icons.mjs
import sharp from "sharp";
import { readFileSync } from "node:fs";
const svg = readFileSync(new URL("./app-icon.svg", import.meta.url));
const out = new URL("../public/app-icons/", import.meta.url).pathname;
for (const [name, size] of [
  ["icon-192.png", 192],
  ["icon-512.png", 512],
  ["apple-touch-icon.png", 180],
]) {
  await sharp(svg, { density: 300 }).resize(size, size).png().toFile(out + name);
}
// Variante « maskable » : marge de sécurité de 10 % pour Android.
const inner = await sharp(svg, { density: 300 }).resize(410, 410).png().toBuffer();
await sharp({
  create: { width: 512, height: 512, channels: 4, background: "#7a1f2b" },
})
  .composite([{ input: inner, gravity: "center" }])
  .png()
  .toFile(out + "icon-maskable-512.png");
console.log("Icônes générées dans public/app-icons/");
