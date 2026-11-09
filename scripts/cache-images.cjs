const fs = require("node:fs");
const { execFileSync } = require("node:child_process");
const products = require("../lib/products.json");
(async () => {
  for (let i = 0; i < products.length; i += 6) {
    await Promise.all(
      products.slice(i, i + 6).map(async (p) => {
        const name = p.id.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const path = `public/images/${name}.jpg`;
        try {
          const response = await fetch(p.image, {
            signal: AbortSignal.timeout(45000),
          });
          if (!response.ok) throw new Error(String(response.status));
          fs.writeFileSync(path, Buffer.from(await response.arrayBuffer()));
          p.image = `/images/${name}.jpg`;
        } catch (e) {
          console.error(p.id, e.message);
        }
      }),
    );
  }
  fs.writeFileSync(
    "lib/products.json",
    JSON.stringify(products, null, 2) + "\n",
  );
  console.log(
    `${products.filter((p) => p.image.startsWith("/")).length}/${products.length} images enregistrées`,
  );
})();
