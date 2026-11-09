import Link from "next/link";
import { ArrowUpRight, Award, Heart, UtensilsCrossed } from "lucide-react";
import { getSettings } from "@/lib/server/db";
export const metadata = {
  title: "Notre maison, artisans depuis 2018 | Boucherie du Faubourg",
};
export default function Maison() {
  const s = getSettings();
  return (
    <>
      <div className="page-intro section">
        <div className="breadcrumb">
          <Link href="/">Accueil</Link>
          <span>/</span>Notre maison
        </div>
        <div className="eyebrow">PLUS QU’UN MÉTIER, UNE CONVICTION</div>
        <h1>
          Une maison.
          <br />
          <em>Le goût du partage.</em>
        </h1>
        <p>
          Derrière chaque belle pièce, il y a des mains, un regard et une
          passion.
        </p>
      </div>
      <section className="story section maison-story">
        <div className="story-visual">
          <img src={s.storyImage} alt="Le travail de l’artisan boucher" />
          <div className="story-card">
            <img
              src={s.logo}
              alt="Logo de la boucherie"
              width={55}
              height={55}
            />
            <span>
              Une viande comme on l’aime.<small>DEPUIS 2018 À AMIENS</small>
            </span>
          </div>
        </div>
        <div className="story-copy">
          <div className="eyebrow">ANCRÉS DANS NOTRE QUARTIER</div>
          <h2>
            Le savoir-faire se transmet.
            <br />
            <em>Le plaisir se partage.</em>
          </h2>
          {s.story
            .split("\n")
            .filter(Boolean)
            .map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          <Link href="/contact" className="text-link">
            Poussez la porte de la maison <ArrowUpRight size={16} />
          </Link>
        </div>
      </section>
      <section className="values section">
        <div>
          <Award />
          <h2>Le goût du bon.</h2>
          <p>
            Une sélection attentive et le souci constant de vous proposer le bon
            morceau pour le bon plat.
          </p>
        </div>
        <div>
          <UtensilsCrossed />
          <h2>Le geste juste.</h2>
          <p>
            La découpe, la préparation, le conseil : toute l’attention d’un
            artisan, du comptoir à votre table.
          </p>
        </div>
        <div>
          <Heart />
          <h2>Le lien avant tout.</h2>
          <p>
            Vous connaître, vous écouter et vous retrouver. Le bonheur simple du
            commerce de quartier.
          </p>
        </div>
      </section>
      <section className="visit-banner section">
        <div>
          <div className="eyebrow">LE MEILLEUR MOYEN DE NOUS CONNAÎTRE</div>
          <h2>On se retrouve au comptoir ?</h2>
          <p>{s.address}</p>
        </div>
        <Link className="button primary" href="/contact">
          Préparer ma visite <ArrowUpRight size={17} />
        </Link>
      </section>
    </>
  );
}
