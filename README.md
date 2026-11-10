# Boucherie du Faubourg

Site de la Boucherie du Faubourg (6 rue d’Abbeville, 80000 Amiens) et **Faubourg Pro**, l’application de gestion du boucher, installable sur iPhone.

Les deux partagent un seul serveur Next.js et une seule base Postgres. Produits, prix, stocks, promotions, commandes et publications n’existent qu’en un seul endroit.

| | Adresse | Pour qui |
|---|---|---|
| Site public | `/` | Clients, moteurs de recherche |
| Faubourg Pro | `/admin` | Propriétaire (PWA installable, périmètre `/admin/`) |

## Lancer le projet

Il faut Node.js 22.13 ou plus récent. En local, aucune base à installer : un Postgres embarqué (PGlite) est créé dans `data/pglite`.

```sh
npm install
cp .env.example .env.local   # puis renseignez ADMIN_SETUP_TOKEN
npm run dev                  # http://localhost:3000
```

Pour la production : `npm run build` puis `npm start`.

**Premier accès** : ouvrez `/admin`, saisissez le code `ADMIN_SETUP_TOKEN`, puis l’e-mail et le mot de passe du propriétaire (12 caractères minimum). Ce code ne sert qu’une fois.

## Ce que fait le client

- Il parcourt l’accueil : hero, promotions en cours, rubrique « Disponible aujourd’hui », rayons, sélection du boucher, actualités, Click & Collect en 3 étapes, recettes, horaires et itinéraire.
- Il cherche dans la boutique : catégories en puces défilantes, recherche et tri par prix. Les fiches indiquent le prix au kg, aux 100 g, à la pièce ou au lot, le stock restant quand il est suivi, et les options de préparation.
- Il commande sans compte : coordonnées (mémorisables sur l’appareil), jour puis créneau de retrait, précisions libres. **La commande est enregistrée en base avant toute confirmation**, et aucun paiement n’a lieu en ligne.
- Il suit sa commande via un lien secret `/commande/suivi/<jeton>`, actualisé automatiquement. Depuis ce suivi, il peut recommander. Le message WhatsApp proposé reste facultatif et est présenté comme tel.
- « Mes commandes » liste les commandes passées depuis l’appareil.
- Côté conseils : recettes avec quantités recalculées selon le nombre de convives, carte interactive des morceaux (bœuf, veau, agneau) et assistant « Que cuisiner ? ».

## Ce que fait le boucher (Faubourg Pro)

La navigation se fait par une barre d’onglets sur iPhone et par une barre latérale sur ordinateur. L’interface suit les conventions iOS : police système, grands titres, feuilles modales que l’on ferme en glissant, mode sombre.

- **Aujourd’hui** : compteurs, commandes à accepter, retraits du jour dans l’ordre chronologique, stocks à surveiller.
- **Commandes** : filtres Nouvelles / En cours / Prêtes / Toutes, recherche, filtre par jour. La fiche de commande met en avant les consignes de préparation et propose une action principale selon le statut. On peut y appeler le client, lui écrire par WhatsApp ou SMS, et imprimer un ticket. L’historique des statuts est conservé et les transitions incohérentes sont refusées. Une annulation demande confirmation et remet les quantités en stock.
- **Produits** : modification rapide en feuille (prix, disponibilité, visibilité, à la une, barbecue, prêt aujourd’hui, stock). La fiche complète gère la photo depuis l’appareil photo, l’unité de vente, les portions, les options de préparation, l’origine et les allergènes. L’écran « Quantités du jour » propose de grands boutons −/+.
- **Publications** : promotion flash (produit, prix, quantité, durée, aperçu, arrêt immédiat), actualités programmables avec photo et produits liés, et recettes.
- **Plus** : informations de la boutique, horaires et créneaux (délai, jour même, capacité, fermetures), notifications, apparence, sécurité, sauvegarde, installation sur iPhone, et liste des points à régler avant la mise en ligne.

Les nouvelles commandes arrivent sans recharger la page : l’app vérifie toutes les 20 secondes et à chaque retour au premier plan. Une alerte s’affiche dans l’app et une pastille apparaît sur l’onglet Commandes et sur l’icône de l’app.

## Règles métier

- **Prix** : recalculés côté serveur, promotion comprise. Si le prix envoyé par le navigateur diffère, la commande est refusée (409).
- **Doublons** : chaque tentative porte un `requestKey`. Un double appui ou une nouvelle tentative réseau renvoie la même commande.
- **Stock** : réservé à l’enregistrement de la commande, dans une transaction exclusive, et rendu en cas d’annulation. Un produit sans suivi de stock dépend seulement de l’interrupteur « disponible ».
- **Promotions** : une quantité maximale facultative, réservée de la même façon. Une promotion disparaît d’elle-même à sa date de fin ou quand elle est épuisée.
- **Retrait** : délai minimum configurable (le lendemain par défaut). Le jour même n’est possible que si tout le panier est « Prêt aujourd’hui ». Chaque créneau a une capacité maximale.
- **Données existantes** : elles sont conservées. Les nouveaux champs reçoivent une valeur par défaut à la lecture (`lib/server/normalize.ts`), et les migrations n’écrasent pas les textes déjà saisis.

## Architecture

```
app/(site)/            site public (polices Fraunces + DM Sans, site.css)
app/admin/             Faubourg Pro (police système, app.css, manifeste, service worker)
app/api/               API : commandes, créneaux, administration, authentification
components/site/       composants du site
components/admin/      composants iOS : ui.tsx (barre, feuilles, listes…), écrans
lib/types.ts           modèle de données partagé
lib/shop.ts, pickup.ts calculs partagés client et serveur (testés)
lib/server/            base (Postgres : Neon / PGlite), validation, commandes, notifications, sécurité
```

## Notifications sur l’iPhone du boucher

Le Web Push est intégré (`web-push`, sans service payant). Les clés VAPID sont générées une seule fois puis stockées en base.

- Sur iPhone, les notifications ne fonctionnent que dans l’app **installée sur l’écran d’accueil** (iOS 16.4 ou plus récent), en HTTPS. Elles s’activent dans Plus → Notifications.
- Toucher une notification ouvre la commande concernée. La connexion reste exigée.
- Un abonnement expiré ou refusé est supprimé automatiquement. Le bouton « Envoyer une notification de test » affiche le résultat réel de l’envoi.

## WhatsApp

- **Sans configuration**, le client peut ouvrir un message prérempli après sa commande (s’il y a un numéro WhatsApp dans Ma boutique), et le boucher peut écrire au client depuis la fiche de commande.
- **Les envois automatiques** passent par l’API WhatsApp Cloud de Meta et ne sont actifs qu’avec les variables `WHATSAPP_*` (voir `.env.example`) et des modèles de message validés par Meta. Sans elles, l’application affiche « non configuré » et ne prétend jamais avoir envoyé quoi que ce soit.

## Hébergement (Vercel)

Le site est prévu pour Vercel. Le disque des fonctions Vercel est en lecture seule et effacé régulièrement, donc rien n’y est stocké :

| Donnée | En ligne (Vercel) | En local |
|---|---|---|
| Base (produits, commandes…) | **Neon** (Postgres) via `DATABASE_URL` (connexion « pooled ») | PGlite (Postgres embarqué) dans `data/pglite` |
| Photos importées | **Vercel Blob** via `BLOB_READ_WRITE_TOKEN` | `data/uploads` |

Les mêmes requêtes Postgres servent dans les deux cas (pilote `pg` en ligne, avec `attachDatabasePool` de `@vercel/functions`). Les tables et le catalogue de départ sont créés automatiquement au premier accès. Les écritures sensibles (stocks, créneaux, promotions) sont sérialisées par un verrou Postgres (`pg_advisory_xact_lock`).

**Mise en place sur Vercel** (offre gratuite Neon suffisante) :

1. Reliez une base Neon au projet `boucherie` : depuis Vercel (**Storage** → **Create Database** → **Neon**) ou depuis la console Neon (intégration Vercel). Choisissez une région en Europe (Francfort). À défaut, copiez la chaîne de connexion « pooled » de Neon dans la variable `DATABASE_URL`.
2. Le Blob store `boucherie-photos` (Paris) est déjà relié au projet.
3. **Settings → Environment Variables** (Production) : `ADMIN_SETUP_TOKEN` (code long et secret) et `APP_ORIGIN` (adresse du site en `https://`, sans `/` final).
4. Redéployez (Deployments → Redeploy), puis ouvrez `/admin` pour créer l’accès du boucher.

Les fonctions tournent à Paris (`vercel.json`, région `cdg1`). Sans base reliée, le site affiche une erreur explicite dans les journaux Vercel au lieu de perdre des données.

Le HTTPS, fourni par Vercel, est indispensable pour la PWA, les notifications et les cookies sécurisés.

### Sauvegarde

```sh
vercel env pull .env.local          # récupère les accès Neon et Blob (une fois)
npm run backup                      # → sauvegardes/boucherie-<date>/ (boutique.json + photos)
npm run restore -- sauvegardes/boucherie-<date>   # sauvegarde l’état actuel, puis remplace tout
```

Les scripts utilisent Neon si `DATABASE_URL` est défini (connexion directe `DATABASE_URL_UNPOOLED` si disponible), sinon la base locale (arrêtez d’abord `npm run dev`). Le boucher peut aussi télécharger les données depuis Plus → Sauvegarde. Neon conserve en plus un historique de la base (restauration à un instant donné, durée selon l’offre).

## Référencement et passage du site Wix à ce site

- Le site fournit les métadonnées de chaque page, `sitemap.xml`, `robots.txt` (qui exclut `/admin`, `/api` et les commandes) et des données structurées (`ButcherShop` avec horaires, `Product`, `Recipe`).
- Les anciennes adresses Wix (`/boutique-en-ligne`, `/mentions-légales`, `/politique-en-matière-de-cookies`, `/forum`, `/membres`, `/product-page/*`) sont redirigées en 308 dans `next.config.ts`.
- **Étapes pour la bascule du domaine** :
  1. Déployez le site sur l’hébergeur et testez-le sur son adresse provisoire.
  2. Baissez le TTL DNS à 300 s la veille.
  3. Pointez `www.boucheriedufaubourg-amiens.com` vers l’hébergeur, et faites rediriger le domaine nu vers `www`.
  4. Ajoutez le domaine dans Vercel (Settings → Domains) et définissez `APP_ORIGIN=https://www.boucheriedufaubourg-amiens.com`.
  5. Soumettez le sitemap dans Google Search Console et mettez à jour la fiche Google Business Profile.
  6. Ne résiliez l’abonnement Wix qu’une fois le nouveau site en ligne.

## Vérifications

```sh
npm run typecheck
npm test                      # calculs, créneaux, fuseau horaire, WhatsApp
npx playwright install chromium
npm run test:e2e              # parcours complets, iPhone SE/13, Pixel, iPad, clair/sombre
npm run build
```

## Reste à faire par la boucherie

L’écran Plus → Avant la mise en ligne liste ces points en direct :

- vérifier les horaires, repris de l’ancien site Wix (lun.–ven. 9h–13h et 15h–19h, sam. 9h–19h, dim. 9h–13h) ;
- compléter les mentions légales : forme juridique, responsable de la publication, hébergeur ;
- renseigner l’origine, les allergènes et de vraies descriptions des produits (aucune donnée n’a été inventée) ;
- activer les notifications sur l’iPhone et, si souhaité, ajouter le numéro WhatsApp ;
- prévoir les conditions générales de vente si un paiement en ligne est envisagé un jour.

## Préparé pour la suite

- **Comptes clients et fidélité** : le montant réellement encaissé peut être saisi au retrait (`paidAmount`). C’est la base des points calculés sur les dépenses réelles. Aujourd’hui, l’historique des commandes est gardé sur l’appareil du client, sans compte. Un vrai compte client (table `customers` liée au téléphone, connexion par code SMS ou e-mail) reste à développer.
- **Nouveaux rayons** : charcuterie, traiteur, préparations maison, lots et produits saisonniers existent déjà comme catégories. Ils apparaissent sur le site dès qu’un produit y est rangé.
