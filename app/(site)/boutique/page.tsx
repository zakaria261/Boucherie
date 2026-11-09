import Link from "next/link";
import { Catalog } from "@/components/catalog";
export const metadata = { title: "La boutique | Boucherie du Faubourg" };
export default async function Boutique({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  return (
    <>
      <div className="page-intro section">
        <div className="breadcrumb">
          <Link href="/">Accueil</Link>
          <span>/</span>La boutique
        </div>
        <div className="eyebrow">DU COMPTOIR À VOTRE TABLE</div>
        <h1>
          De belles pièces.
          <br />
          <em>De belles tablées.</em>
        </h1>
        <p>
          Votre marché chez l’artisan, à votre rythme. Choisissez vos viandes,
          <br />
          nous les préparons avec le même soin qu’au comptoir.
        </p>
      </div>
      <Catalog
        category={params.categorie}
        query={params.q}
        focus={params.recherche === "1"}
      />
    </>
  );
}
