import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Award,
  ShieldCheck,
  ShoppingBag,
  UtensilsCrossed,
  Flame,
} from "lucide-react";
import { getProducts, getSettings } from "@/lib/server/db";
import { ProductCard } from "@/components/store";
export default function Home() {
  const settings = getSettings(),
    products = getProducts();
  const featured = products.filter((p) => p.featured).slice(0, 4);
  const titles = settings.headline.split("\n");
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow">
            <span /> VOTRE ARTISAN BOUCHER À AMIENS
          </div>
          <h1>
            {titles[0]}
            <br />
            <em>{titles.slice(1).join(" ")}</em>
          </h1>
          <p>{settings.intro}</p>
          <div className="hero-buttons">
            <Link className="button primary" href="/boutique">
              Découvrir la boutique <ArrowRight size={17} />
            </Link>
            <Link className="text-link" href="/notre-maison">
              L’histoire de notre maison <ArrowUpRight size={16} />
            </Link>
          </div>
          <div className="hero-note">
            <span className="mini-seal">
              <UtensilsCrossed size={22} />
            </span>
            <span>
              <strong>Du cœur à l’ouvrage. Du goût à table.</strong>
              <small>Votre boucher de quartier, depuis 2018.</small>
            </span>
          </div>
        </div>
        <div className="hero-image">
          <img
            src={settings.hero}
            alt="Le goût du savoir-faire de la Boucherie du Faubourg"
            fetchPriority="high"
          />
          <div className="image-shade" />
          <div className="hero-logo-seal">
            <img
              src={settings.logo}
              alt="Boucherie du Faubourg — viande d’exception"
            />
          </div>
          <div className="image-caption">
            <span>LA QUALITÉ SE SAVOURE.</span>
            <strong>Et ça commence ici.</strong>
            <Link
              href="/boutique"
              className="caption-arrow"
              aria-label="Voir la boutique"
            >
              <ArrowUpRight size={25} />
            </Link>
          </div>
        </div>
      </section>
      <section className="benefits">
        <div>
          <Award />
          <span>
            <strong>Le savoir-faire artisanal</strong>
            <small>La passion du métier, chaque jour</small>
          </span>
        </div>
        <div>
          <ShieldCheck />
          <span>
            <strong>Des viandes sélectionnées</strong>
            <small>Le goût et la qualité avant tout</small>
          </span>
        </div>
        <div>
          <UtensilsCrossed />
          <span>
            <strong>Préparé par nos bouchers</strong>
            <small>Des découpes et recettes maison</small>
          </span>
        </div>
        <div>
          <ShoppingBag />
          <span>
            <strong>Retrait en boutique</strong>
            <small>La veille pour le lendemain</small>
          </span>
        </div>
      </section>
      <section className="section shop">
        <div className="section-heading">
          <div>
            <div className="eyebrow">LE MEILLEUR DE NOTRE COMPTOIR</div>
            <h2>Les envies du moment.</h2>
          </div>
          <Link className="text-link" href="/boutique">
            Toute la boutique <ArrowRight size={16} />
          </Link>
        </div>
        <div className="product-grid">
          {featured.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>
      <section className="category-editorial section">
        <div className="section-heading">
          <div>
            <div className="eyebrow">À CHAQUE ENVIE, SA BELLE PIÈCE</div>
            <h2>Faites votre marché.</h2>
          </div>
          <p>
            Le plaisir de choisir.
            <br />
            Le conseil de votre artisan en plus.
          </p>
        </div>
        <div className="category-tiles">
          {["Bœuf", "Volailles", "Veau", "Agneau"].map((name, i) => {
            const image =
              products.find(
                (p) => p.category === name && p.featured && !p.grill,
              )?.image ||
              products.find((p) => p.category === name && p.featured)?.image ||
              products.find((p) => p.category === name)?.image;
            return (
              <Link
                href={`/boutique?categorie=${encodeURIComponent(name)}`}
                key={name}
              >
                <img
                  src={image || settings.hero}
                  alt={`Notre sélection ${name}`}
                  loading="lazy"
                />
                <span>
                  <small>0{i + 1} / LE COMPTOIR</small>
                  <strong>{name}</strong>
                  <ArrowUpRight />
                </span>
              </Link>
            );
          })}
        </div>
      </section>
      <section className="barbecue section">
        <div className="bbq-photo">
          <img
            src={products.find((p) => p.grill)?.image || settings.hero}
            alt="Nos brochettes préparées en boutique"
            loading="lazy"
          />
          <span className="bbq-sticker">
            <Flame size={26} />
            LES BEAUX JOURS
            <br />
            ONT DU GOÛT
          </span>
        </div>
        <div className="bbq-copy">
          <div className="eyebrow">LE BONHEUR, ÇA SE PARTAGE</div>
          <h2>
            Les braises crépitent.
            <br />
            <em>Les bons moments aussi.</em>
          </h2>
          <p>
            Brochettes généreuses, merguez maison, viandes marinées… Il ne
            manque plus que vos proches autour de la table.
          </p>
          <Link className="button cream" href="/barbecue">
            Explorer la sélection barbecue <ArrowRight size={17} />
          </Link>
        </div>
      </section>
      <section className="home-story section">
        <img
          src={settings.logo}
          alt="Logo original de la Boucherie du Faubourg"
        />
        <div>
          <div className="eyebrow">UNE MAISON, UNE PASSION DEPUIS 2018</div>
          <h2>Le bon goût du commerce de quartier.</h2>
          <p>
            Des gestes précis, le goût du travail bien fait et toujours un
            conseil à partager. Bienvenue chez votre artisan.
          </p>
          <Link className="text-link" href="/notre-maison">
            Rencontrer notre maison <ArrowUpRight size={16} />
          </Link>
        </div>
      </section>
    </>
  );
}
