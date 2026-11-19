import Link from "next/link";
import { ArrowRight, BookOpen, ClipboardList, MapPin, Phone } from "lucide-react";
import {
  getPublicPosts,
  getPublicProducts,
  getRecipes,
  getSettings,
} from "@/lib/server/db";
import { getOffers } from "@/lib/server/offers";
import { getFestive } from "@/lib/server/fetes";
import { directionsUrl, siteUrl, telHref } from "@/lib/site";
import { scheduleLines } from "@/lib/pickup";
import { faq } from "@/lib/faq";
import { money } from "@/lib/shop";
import { Photo } from "@/components/site/photo";
import { ProductCard } from "@/components/site/product-card";
import { PostCard } from "@/components/site/post-card";
import { HeroSlider, ProductTabs, Rail, type Slide } from "@/components/site/home";

export default async function Home() {
  const settings = await getSettings();
  const products = await getPublicProducts();
  const promos = products.filter((p) => p.promo && p.available);
  const today = products.filter(
    (p) => p.readyToday && p.available && (p.stock === null || p.stock > 0),
  );
  const featured = products.filter((p) => p.featured).slice(0, 12);
  const recipes = (await getRecipes()).slice(0, 3);
  // Actualités : celles mises en avant d'abord, depuis l'application.
  const posts = (await getPublicPosts())
    .sort((a, b) => Number(b.featured) - Number(a.featured))
    .slice(0, 3);
  const offers = await getOffers();
  const festive = await getFestive();
  const grill = products.filter((p) => p.grill && p.available).slice(0, 12);
  const lots = offers.lots.filter((l) => l.visible);
  const cheapestLot = lots.length ? Math.min(...lots.map((l) => l.price)) : 0;
  const bestDiscount = Math.max(
    0,
    ...promos.map((p) => Math.round((1 - (p.promo!.price / p.price)) * 100)),
  );

  // Diapositives : uniquement des offres réelles de la boutique.
  const slides: Slide[] = [
    ...(festive.visible
      ? [{
          id: "fetes",
          kicker: "Fêtes de fin d’année 2026",
          title: "Les fêtes se préparent au Faubourg",
          text: "Foies gras, volailles fermières, pièces d’exception : feuilletez notre catalogue et commandez à l’avance.",
          cta: "Feuilleter le catalogue",
          href: "/catalogue-des-fetes",
          image: "/images/cote-a-l-os-mature.jpg",
          tone: "sand" as const,
        }]
      : []),
    {
      id: "plateaux",
      kicker: "Commandez la veille pour le lendemain",
      title: "Plateaux à partager",
      text: "Fondue bourguignonne, pierrade et plancha nature ou marinée, plateau charcuterie : indiquez le nombre de personnes ou votre budget.",
      cta: "Composer mon plateau",
      href: "/plateaux-a-partager",
      image: "/images/plateaux/pierrade.jpg",
      tone: "stone",
    },
    ...(promos.length
      ? [{
          id: "promotions",
          kicker: "Promotions du boucher",
          title: bestDiscount >= 5 ? `Jusqu’à −${bestDiscount} % cette semaine` : "Les promotions de la semaine",
          text: "Une sélection de nos morceaux à prix doux, dans la limite des quantités préparées.",
          cta: "Découvrir les offres",
          href: "/promotions",
          image: promos[0].image || "/images/hero.jpg",
          tone: "blush" as const,
        }]
      : []),
    ...(cheapestLot
      ? [{
          id: "lots",
          kicker: "Lots et marinades",
          title: `Nos lots dès ${money(cheapestLot).replace(",00", "")}`,
          text: "Des colis pour toute la famille et nos marinades maison, à retirer le lendemain en boutique.",
          cta: "Voir les lots",
          href: "/lots-et-marinades",
          image: "/images/emince-de-poulet-orientale.jpg",
          tone: "sand" as const,
        }]
      : []),
  ];

  const tabs = [
    { id: "promos", label: "Promotions du boucher", href: "/promotions", products: promos.slice(0, 12) },
    { id: "choix", label: "Le choix du boucher", href: "/boutique", products: featured },
    { id: "jour", label: "Prêt aujourd’hui", href: "/boutique", products: today.slice(0, 12) },
  ].filter((t) => t.products.length);

  const specialties = [
    {
      kicker: "Commande la veille",
      title: "Plateaux à partager",
      text: "Fondue, pierrade et plancha, charcuterie : nous composons le plateau pour vos convives.",
      href: "/plateaux-a-partager",
      cta: "Composer mon plateau",
      image: "/images/plateaux/fondue.jpg",
    },
    {
      kicker: "Pour toute la famille",
      title: "Lots et marinades",
      text: cheapestLot
        ? `Des colis prêts à emporter dès ${money(cheapestLot).replace(",00", "")}, et nos viandes marinées maison.`
        : "Des colis prêts à emporter et nos viandes marinées maison.",
      href: "/lots-et-marinades",
      cta: "Voir les lots",
      image: "/images/emince-de-poulet-tandoori-masala.jpg",
    },
    ...(festive.visible
      ? [{
          kicker: "Catalogue 2026",
          title: "Fêtes de fin d’année",
          text: "Foies gras, volailles fermières, rôtis farcis : le catalogue se feuillette en ligne.",
          href: "/catalogue-des-fetes",
          cta: "Feuilleter le catalogue",
          image: "/images/cote-a-l-os-mature.jpg",
        }]
      : []),
    {
      kicker: "Comme au comptoir",
      title: "Ma liste de courses",
      text: "Écrivez votre liste librement : nous préparons tout et vous confirmons le prix.",
      href: "/liste-de-courses",
      cta: "Écrire ma liste",
      image: "/images/bifteck.jpg",
    },
  ];

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
      <h1 className="sr-only">Boucherie du Faubourg</h1>
      <p className="sr-only">{settings.headline}</p>

      <HeroSlider slides={slides} />

      {tabs.length > 0 && (
        <section className="home-section" id="promotions" aria-label="Sélections du boucher">
          <ProductTabs tabs={tabs} />
        </section>
      )}

      <section className="manifesto" aria-label="Notre métier">
        <p>
          Le goût du métier,{" "}
          <span className="manifesto-img">
            <Photo src="/images/hero.jpg" sizes="160px" />
          </span>{" "}
          la découpe sur mesure{" "}
          <span className="manifesto-img">
            <Photo src="/images/cote-a-l-os-mature.jpg" sizes="160px" />
          </span>{" "}
          et le plaisir d’être bien conseillé.{" "}
          <span className="manifesto-img">
            <Photo src="/images/merguez-maison.jpg" sizes="160px" />
          </span>
        </p>
        <Link className="button pill dark" href="/notre-maison">
          Notre maison
        </Link>
      </section>

      {posts.length > 0 && (
        <section className="home-section">
          <div className="rail-head">
            <h2 className="home-title">Au comptoir cette semaine</h2>
            <Link className="rail-link" href="/actualites">
              Toutes les actualités
            </Link>
          </div>
          <div className="news-row">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        </section>
      )}

      {grill.length > 0 && (
        <section className="home-section">
          <Rail
            label="Pour vos grillades"
            title={<h2 className="home-title">Pour vos grillades</h2>}
            link={{ href: "/barbecue", label: "Voir tout" }}
          >
            {grill.map((p) => (
              <div role="listitem" className="rail-item" key={p.id}>
                <ProductCard product={p} />
              </div>
            ))}
          </Rail>
        </section>
      )}

      <section className="home-section">
        <Rail label="Nos spécialités" wide title={<h2 className="home-title">Nos spécialités</h2>}>
          {specialties.map((c) => (
            <article role="listitem" className="special-card" key={c.href}>
              <Photo src={c.image} sizes="(min-width: 900px) 760px, 90vw" />
              <div className="special-text">
                <span className="mono-kicker">{c.kicker}</span>
                <h3>{c.title}</h3>
                <p>{c.text}</p>
                <Link className="button pill dark" href={c.href}>
                  {c.cta}
                </Link>
              </div>
            </article>
          ))}
        </Rail>
      </section>

      <section className="home-section">
        <div className="guide-band">
          <div className="guide-photo">
            <Photo src="/images/paleron.jpg" sizes="(min-width: 900px) 640px, 100vw" />
            <span className="guide-badge">Bœuf · agneau · veau</span>
          </div>
          <div className="guide-text">
            <span className="mono-kicker">Guide des morceaux</span>
            <h2 className="home-title">Quel morceau pour quelle recette ?</h2>
            <p>
              Où se trouve la bavette ? À quoi sert le paleron ? Explorez les morceaux du bœuf, de l’agneau et du
              veau, avec nos conseils de cuisson et les produits de la vitrine.
            </p>
            <div className="pill-actions">
              <Link className="button pill dark" href="/morceaux">
                <BookOpen size={17} aria-hidden="true" /> Explorer le guide
              </Link>
              <Link className="button pill" href="/que-cuisiner">
                Que cuisiner ?
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="home-section">
        <div className="answers">
          <div className="answers-intro">
            <h2 className="home-title">On vous répond !</h2>
            <p>Commande, paiement, découpe : l’essentiel en quatre questions. Pour le reste, appelez-nous ou passez au comptoir.</p>
            <div className="pill-actions">
              <Link className="button pill dark" href="/contact#questions">
                Contact et horaires
              </Link>
              {settings.phone && (
                <a className="button pill" href={telHref(settings.phone)}>
                  <Phone size={17} aria-hidden="true" /> {settings.phone}
                </a>
              )}
            </div>
          </div>
          <div className="answers-list">
            {faq.map((f) => (
              <details key={f.question}>
                <summary>{f.question}</summary>
                <p>{f.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="home-section">
        <div className="tiles">
          <Link className="tile" href="/recettes">
            <Photo src={recipes[0]?.image || "/images/gigot.jpg"} sizes="(min-width: 900px) 420px, 100vw" />
            <span className="tile-body">
              <strong>Recettes et conseils</strong>
              <small>{recipes.length ? `${recipes[0].title} et nos autres recettes` : "Nos recettes, pas à pas"}</small>
              <span className="button pill">Je découvre</span>
            </span>
          </Link>
          <a className="tile" href={directionsUrl(settings.address)} target="_blank" rel="noreferrer">
            <Photo src="/images/artisan.jpg" sizes="(min-width: 900px) 420px, 100vw" />
            <span className="tile-body">
              <strong>Retrait en boutique</strong>
              <small>{settings.address}</small>
              <span className="button pill">
                <MapPin size={16} aria-hidden="true" /> Itinéraire
              </span>
            </span>
          </a>
          <Link className="tile" href="/professionnels">
            <Photo src="/images/plateaux/charcuterie.jpg" sizes="(min-width: 900px) 420px, 100vw" />
            <span className="tile-body">
              <strong>Professionnels</strong>
              <small>Restaurants, traiteurs, associations : devis et commandes régulières.</small>
              <span className="button pill">
                <ClipboardList size={16} aria-hidden="true" /> Espace pro
              </span>
            </span>
          </Link>
        </div>
      </section>
    </>
  );
}
