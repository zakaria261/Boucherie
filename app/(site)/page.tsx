import Link from "next/link";
import {
  ArrowRight,
  MapPin,
  Navigation,
  Phone,
  ShoppingBag,
  Store,
  Timer,
} from "lucide-react";
import {
  getPublicPosts,
  getPublicProducts,
  getRecipes,
  getSettings,
} from "@/lib/server/db";
import { categories } from "@/lib/types";
import { ProductCard, TodayCard } from "@/components/site/product-card";
import { PostCard } from "@/components/site/post-card";
import { OpeningHours, todayHours } from "@/components/site/hours";
import { directionsUrl, siteUrl, telHref } from "@/lib/site";
import { scheduleLines } from "@/lib/pickup";
import { Photo } from "@/components/site/photo";

export default async function Home() {
  const settings = await getSettings();
  const products = await getPublicProducts();
  const promos = products.filter((p) => p.promo && p.available);
  const today = products.filter(
    (p) => p.readyToday && p.available && (p.stock === null || p.stock > 0),
  );
  const featured = products.filter((p) => p.featured).slice(0, 4);
  const posts = (await getPublicPosts())
    .sort((a, b) => Number(b.featured) - Number(a.featured))
    .slice(0, 3);
  const recipes = (await getRecipes()).slice(0, 3);
  const shelves = categories
    .map((name) => {
      const inShelf = products.filter((p) => p.category === name);
      return {
        name,
        count: inShelf.length,
        image: (inShelf.find((p) => p.featured) || inShelf[0])?.image,
      };
    })
    .filter((s) => s.count > 0);
  const hoursToday = todayHours(settings.pickup);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ButcherShop",
    name: settings.name,
    image: `${siteUrl}${settings.hero}`,
    logo: `${siteUrl}${settings.logo}`,
    url: siteUrl,
    telephone: settings.phone || undefined,
    email: settings.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: "6 rue d’Abbeville",
      postalCode: "80000",
      addressLocality: "Amiens",
      addressCountry: "FR",
    },
    openingHoursSpecification: scheduleLines(settings.pickup).flatMap((line) =>
      (settings.pickup.week.find((d) => d.day === line.day)?.ranges || []).map(
        ([opens, closes]) => ({
          "@type": "OpeningHoursSpecification",
          dayOfWeek: `https://schema.org/${
            [
              "Sunday",
              "Monday",
              "Tuesday",
              "Wednesday",
              "Thursday",
              "Friday",
              "Saturday",
            ][line.day]
          }`,
          opens,
          closes,
        }),
      ),
    ),
    foundingDate: "2018",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <section className="hero">
        <Photo src={settings.hero} sizes="100vw" preload />
        <div className="hero-content">
          <span className="eyebrow light">
            Artisan boucher · Amiens · depuis 2018
          </span>
          <h1>Boucherie du Faubourg</h1>
          <p className="hero-tagline">{settings.headline}</p>
          <div className="hero-actions">
            <Link className="button primary" href="/boutique">
              <ShoppingBag size={18} /> Commander
            </Link>
            <Link className="button ghost-light" href="/promotions">
              Voir les promotions
            </Link>
          </div>
        </div>
      </section>

      <div className="info-strip">
        <div>
          <Timer size={18} />
          <span>
            <strong>
              {hoursToday ? "Ouvert aujourd’hui" : "Fermé aujourd’hui"}
            </strong>
            <small>{hoursToday || "Commandez pour un autre jour"}</small>
          </span>
        </div>
        <a
          href={directionsUrl(settings.address)}
          target="_blank"
          rel="noreferrer"
        >
          <MapPin size={18} />
          <span>
            <strong>6 rue d’Abbeville</strong>
            <small>Itinéraire</small>
          </span>
        </a>
        <div>
          <Store size={18} />
          <span>
            <strong>Click &amp; Collect</strong>
            <small>{settings.announcement || "Retrait en boutique"}</small>
          </span>
        </div>
      </div>

      {promos.length > 0 && (
        <section className="block" id="promotions">
          <div className="block-head">
            <div>
              <span className="eyebrow">En ce moment</span>
              <h2>Les promotions</h2>
            </div>
            <Link className="text-link" href="/promotions">
              Tout voir <ArrowRight size={16} />
            </Link>
          </div>
          <div className="product-grid scroll-mobile">
            {promos.slice(0, 4).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {today.length > 0 && (
        <section className="block">
          <div className="block-head">
            <div>
              <span className="eyebrow">Prêt au comptoir</span>
              <h2>Disponible aujourd’hui</h2>
              <p>
                Ces produits sont déjà prêts : réservez-les et passez les
                chercher dès aujourd’hui.
              </p>
            </div>
          </div>
          <div className="today-grid">
            {today.slice(0, 6).map((p) => (
              <TodayCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      <section className="block">
        <div className="block-head">
          <div>
            <span className="eyebrow">Nos rayons</span>
            <h2>Que vous faut-il ?</h2>
          </div>
        </div>
        <div className="shelf-grid">
          {shelves.map((s) => (
            <Link
              key={s.name}
              className="shelf"
              href={`/boutique?categorie=${encodeURIComponent(s.name)}`}
            >
              <Photo src={s.image} sizes="(max-width: 640px) 50vw, (max-width: 1100px) 33vw, 300px" />
              <span>
                <strong>{s.name}</strong>
                <small>{s.count} produits</small>
              </span>
            </Link>
          ))}
          <Link className="shelf" href="/barbecue">
            <Photo src="/images/brochette-filet-de-rumsteck.jpg" sizes="(max-width: 640px) 50vw, (max-width: 1100px) 33vw, 300px" />
            <span>
              <strong>Barbecue</strong>
              <small>Brochettes, saucisses, marinades</small>
            </span>
          </Link>
        </div>
      </section>

      {featured.length > 0 && (
        <section className="block">
          <div className="block-head">
            <div>
              <span className="eyebrow">Le choix du boucher</span>
              <h2>Nos incontournables</h2>
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
      )}

      {posts.length > 0 && (
        <section className="block">
          <div className="block-head">
            <div>
              <span className="eyebrow">Au comptoir</span>
              <h2>Les nouvelles de la boucherie</h2>
            </div>
            <Link className="text-link" href="/actualites">
              Toutes les actualités <ArrowRight size={16} />
            </Link>
          </div>
          <div className="post-grid">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        </section>
      )}

      <section className="block collect">
        <div className="block-head">
          <div>
            <span className="eyebrow">Click &amp; Collect</span>
            <h2>Commandez, on prépare, vous passez.</h2>
          </div>
        </div>
        <ol className="steps">
          <li>
            <span>1</span>
            <h3>Vous choisissez</h3>
            <p>Vos morceaux, le poids, la découpe. Sans créer de compte.</p>
          </li>
          <li>
            <span>2</span>
            <h3>Nous préparons</h3>
            <p>
              Votre boucher prépare la commande pour le jour et l’heure choisis.
            </p>
          </li>
          <li>
            <span>3</span>
            <h3>Vous récupérez</h3>
            <p>Vous passez en boutique et réglez sur place, au poids exact.</p>
          </li>
        </ol>
        <Link className="button primary" href="/boutique">
          Commencer ma commande <ArrowRight size={18} />
        </Link>
      </section>

      {recipes.length > 0 && (
        <section className="block">
          <div className="block-head">
            <div>
              <span className="eyebrow">Recettes et conseils</span>
              <h2>Bien cuisiner sa viande</h2>
            </div>
            <Link className="text-link" href="/recettes">
              Toutes les recettes <ArrowRight size={16} />
            </Link>
          </div>
          <div className="recipe-grid">
            {recipes.map((r) => (
              <Link
                className="recipe-card"
                key={r.id}
                href={`/recettes/${r.id}`}
              >
                <Photo src={r.image} sizes="(max-width: 640px) 100vw, (max-width: 1100px) 50vw, 400px" />
                <span>
                  <strong>{r.title}</strong>
                  <small>
                    {r.servings} pers. · {r.prepMinutes + r.cookMinutes} min
                  </small>
                </span>
              </Link>
            ))}
          </div>
          <div className="tool-links">
            <Link href="/morceaux">
              <strong>Les morceaux</strong>
              <span>Où se trouve la bavette ? À quoi sert le paleron ?</span>
              <ArrowRight size={18} />
            </Link>
            <Link href="/que-cuisiner">
              <strong>Que cuisiner ?</strong>
              <span>
                Une idée selon le repas, le nombre de convives et le budget.
              </span>
              <ArrowRight size={18} />
            </Link>
          </div>
        </section>
      )}

      <section className="block practical">
        <div>
          <span className="eyebrow">Nous trouver</span>
          <h2>Informations pratiques</h2>
          <address>
            <strong>{settings.name}</strong>
            <br />
            {settings.address}
          </address>
          <div className="practical-actions">
            <a
              className="button primary"
              href={directionsUrl(settings.address)}
              target="_blank"
              rel="noreferrer"
            >
              <Navigation size={18} /> Itinéraire
            </a>
            {settings.phone && (
              <a className="button outline" href={telHref(settings.phone)}>
                <Phone size={18} /> {settings.phone}
              </a>
            )}
          </div>
        </div>
        <OpeningHours pickup={settings.pickup} note={settings.hours} />
      </section>
    </>
  );
}
