import Link from "next/link";
import {
  ArrowRight,
  Briefcase,
  ClipboardList,
  MessageCircle,
  Navigation,
  Phone,
  ShoppingBag,
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
import { todayHours } from "@/components/site/hours";
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
      {/* Rayons à portée de main, comme dans une vraie boutique en ligne. */}
      <nav className="aisles" aria-label="Rayons">
        <div className="aisles-inner">
          {shelves.map((s) => (
            <Link key={s.name} href={`/boutique?categorie=${encodeURIComponent(s.name)}`}>
              {s.name}
            </Link>
          ))}
          <Link href="/barbecue">Barbecue</Link>
          <Link href="/plateaux-a-partager">Plateaux à partager</Link>
          <Link href="/lots-et-marinades">Lots et marinades</Link>
          <Link href="/catalogue-des-fetes" className="aisle-highlight">
            Fêtes 2026
          </Link>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-panel">
          <span className="hero-kicker">Artisan boucher à Amiens depuis 2018</span>
          <h1>Boucherie du Faubourg</h1>
          <p className="hero-tagline">{settings.headline}</p>
          <ul className="hero-points">
            <li>Commandez en ligne, retirez en boutique</li>
            <li>Découpe et préparation sur mesure</li>
            <li>Paiement au retrait, au poids exact</li>
          </ul>
          <div className="hero-actions">
            <Link className="button light" href="/boutique">
              <ShoppingBag size={18} /> Commander
            </Link>
            <Link className="button ghost-light" href="/promotions">
              Voir les promotions
            </Link>
          </div>
        </div>
        <div className="hero-photo">
          <Photo src="/images/banniere-viandes.jpg" sizes="(min-width: 900px) 640px, 100vw" preload />
          <span className="hero-open">
            <Timer size={16} aria-hidden="true" />
            {hoursToday ? `Ouvert aujourd’hui · ${hoursToday}` : "Fermé aujourd’hui · commandez pour demain"}
          </span>
        </div>
      </section>

      {(promos.length > 0 || featured.length > 0) && (
        <section className="block" id="promotions">
          <div className="section-title">
            <h2>{promos.length ? "Les promotions de la semaine" : "Le choix du boucher"}</h2>
            <span className="section-rule" aria-hidden="true" />
          </div>
          <div className="product-grid scroll-mobile">
            {(promos.length ? promos : featured).slice(0, 8).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
          <div className="section-cta">
            <Link className="button primary" href={promos.length ? "/promotions" : "/boutique"}>
              {promos.length ? "Toutes nos promotions" : "Toute la boutique"} <ArrowRight size={18} />
            </Link>
          </div>
        </section>
      )}

      {today.length > 0 && (
        <section className="block">
          <div className="section-title">
            <h2>Prêt aujourd’hui au comptoir</h2>
            <span className="section-rule" aria-hidden="true" />
          </div>
          <div className="today-grid">
            {today.slice(0, 6).map((p) => (
              <TodayCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      <section className="feature-band" aria-label="Nos spécialités">
        <div className="feature-grid">
          <Link className="feature-tile" href="/plateaux-a-partager">
            <span className="feature-title">Plateaux à partager</span>
            <Photo src="/images/plateaux/fondue.jpg" sizes="(min-width: 900px) 400px, 100vw" />
            <span className="feature-text">Fondue, pierrade et plancha, charcuterie. Commandez la veille.</span>
          </Link>
          <Link className="feature-tile" href="/lots-et-marinades">
            <span className="feature-title">Lots et marinades</span>
            <Photo src="/images/emince-de-poulet-orientale.jpg" sizes="(min-width: 900px) 400px, 100vw" />
            <span className="feature-text">Des colis pour toute la famille et nos marinades maison.</span>
          </Link>
          <Link className="feature-tile" href="/catalogue-des-fetes">
            <span className="feature-title">Catalogue des fêtes</span>
            <Photo src="/images/cote-a-l-os-mature.jpg" sizes="(min-width: 900px) 400px, 100vw" />
            <span className="feature-text">Foies gras, volailles fermières, pièces d’exception. À feuilleter en ligne.</span>
          </Link>
        </div>
      </section>

      {promos.length > 0 && featured.length > 0 && (
        <section className="block">
          <div className="section-title">
            <h2>Le choix du boucher</h2>
            <span className="section-rule" aria-hidden="true" />
          </div>
          <div className="product-grid">
            {featured.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      <section className="block">
        <div className="visit-banner">
          <div className="visit-text">
            <h2>Venez nous voir au 6 rue d’Abbeville</h2>
            <p>
              Des bouchers passionnés qui sélectionnent, découpent et préparent avec soin. Une envie particulière ?
              Parlons-en au comptoir.
            </p>
            <p className="visit-hours">
              <Timer size={18} aria-hidden="true" />
              {hoursToday ? `Aujourd’hui : ${hoursToday}` : "Fermé aujourd’hui"}
            </p>
            <div className="visit-actions">
              <a className="button light" href={directionsUrl(settings.address)} target="_blank" rel="noreferrer">
                <Navigation size={18} /> Itinéraire
              </a>
              <Link className="button ghost-light" href="/contact">
                Horaires et contact
              </Link>
            </div>
          </div>
          <div className="visit-photo">
            <Photo src="/images/artisan.jpg" sizes="(min-width: 900px) 560px, 100vw" />
          </div>
        </div>
      </section>

      {(posts.length > 0 || recipes.length > 0) && (
        <section className="block">
          <div className="section-title">
            <h2>À la une</h2>
            <span className="section-rule" aria-hidden="true" />
          </div>
          <div className="news-grid">
            {posts.slice(0, 1).map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
            {recipes.slice(0, posts.length ? 2 : 3).map((r) => (
              <Link className="recipe-card" key={r.id} href={`/recettes/${r.id}`}>
                <Photo src={r.image} sizes="(max-width: 640px) 100vw, 400px" />
                <span>
                  <em className="news-tag">Recette</em>
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
              <strong>Guide des morceaux</strong>
              <span>Où se trouve la bavette ? À quoi sert le paleron ?</span>
              <ArrowRight size={18} />
            </Link>
            <Link href="/que-cuisiner">
              <strong>Que cuisiner ?</strong>
              <span>Une idée selon le repas, le nombre de convives et le budget.</span>
              <ArrowRight size={18} />
            </Link>
          </div>
        </section>
      )}

      <section className="service-cards" aria-label="Services">
        <div className="service-card">
          <ClipboardList size={40} strokeWidth={1.5} aria-hidden="true" />
          <h2>Ma liste de courses</h2>
          <p>Écrivez votre liste comme au comptoir : nous préparons tout et vous confirmons le prix.</p>
          <Link className="button primary" href="/liste-de-courses">
            Écrire ma liste
          </Link>
        </div>
        <div className="service-card">
          <MessageCircle size={40} strokeWidth={1.5} aria-hidden="true" />
          <h2>Une question ?</h2>
          <p>Nous vous répondons volontiers, au comptoir ou par téléphone.</p>
          {settings.phone && (
            <a className="service-link" href={telHref(settings.phone)}>
              <Phone size={18} aria-hidden="true" /> {settings.phone}
            </a>
          )}
          <a className="service-link" href={`mailto:${settings.email}`}>
            {settings.email}
          </a>
        </div>
        <div className="service-card">
          <Briefcase size={40} strokeWidth={1.5} aria-hidden="true" />
          <h2>Professionnels</h2>
          <p>Restaurants, traiteurs, associations : demandes de devis et commandes régulières.</p>
          <Link className="button primary" href="/professionnels">
            Espace professionnels
          </Link>
        </div>
      </section>
    </>
  );
}
