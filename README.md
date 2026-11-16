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
- **Ma liste de courses** (`/liste-de-courses`) : pour les produits absents du catalogue. Le client écrit ses articles (quantité en g, kg ou pièces, précisions), choisit un créneau parmi les vrais horaires, relit sa note, peut la modifier, puis l’envoie. Aucun prix n’est attribué : le montant reste « à confirmer » par la boucherie. La confirmation n’apparaît qu’après l’enregistrement en base ; elle donne une référence `LC-…`, une note à cocher (cases personnelles, sur l’appareil) et un PDF à télécharger ou imprimer.
- **Espace professionnels** (`/professionnels`) : demande de devis ou de commande sans compte. Identité de la structure (SIRET contrôlé dans son format, cas « sans SIRET » justifié, entreprise étrangère), articles avec découpe, poids cible par pièce (poids total indicatif), conditionnement, retrait impératif ou flexible, besoin ponctuel ou récurrent. Une demande de devis va dans la file Devis ; une demande de commande attend la validation de la boucherie. Chaque entreprise dispose d’un espace privé par lien (`/professionnels/espace/<jeton>`) : ses commandes et devis, ses coordonnées, la reprise d’une ancienne demande.
- « Mes commandes » liste les commandes et demandes passées depuis l’appareil.
- Côté conseils : recettes avec quantités recalculées selon le nombre de convives, carte interactive des morceaux (bœuf, veau, agneau) et assistant « Que cuisiner ? ».

## Ce que fait le boucher (Faubourg Pro)

La navigation se fait par une barre d’onglets sur iPhone et par une barre latérale sur ordinateur. L’interface suit les conventions iOS : police système, grands titres, feuilles modales que l’on ferme en glissant, mode sombre.

- **Aujourd’hui** : compteurs, commandes à accepter, retraits du jour dans l’ordre chronologique, stocks à surveiller.
- **Commandes** : une seule file pour toutes les origines (site, liste de courses, PRO, téléphone, comptoir, WhatsApp, photo, devis accepté). Vues Demandes / À préparer / Prêtes / Toutes, filtres par jour, créneau, origine, particulier ou PRO, retards ; recherche par référence, nom, entreprise ou téléphone. Le bouton + saisit une commande reçue hors du site, avec photo d’origine si besoin. La fiche de commande met en avant les consignes de préparation et propose une action principale selon le statut. On peut y appeler le client, lui écrire par WhatsApp ou SMS, et imprimer un ticket. La préparation se fait ligne par ligne : cases enregistrées en base et partagées entre collaborateurs (synchronisation toutes les 8 s), poids préparé, remplacement, prix final. Cocher ne change jamais le statut. Notes internes jamais visibles du client. L’historique des statuts est conservé et les transitions incohérentes sont refusées. Une annulation demande confirmation et remet les quantités en stock.
- **Produits** : modification rapide en feuille (prix, disponibilité, visibilité, à la une, barbecue, prêt aujourd’hui, stock). La fiche complète gère la photo depuis l’appareil photo, l’unité de vente, les portions, les options de préparation, l’origine et les allergènes. L’écran « Quantités du jour » propose de grands boutons −/+.
- **Publications** : promotion flash (produit, prix, quantité, durée, aperçu, arrêt immédiat), actualités programmables avec photo et produits liés, et recettes.
- **Devis** (depuis Commandes, Aujourd’hui ou Plus) : demande d’origine conservée, lignes avec prix HT et TVA (5,5 % par défaut, modifiable), totaux HT/TVA/TTC exacts, validité, conditions, numéro officiel attribué à l’établissement (`D2026-0001`), PDF, lien client, envoi, acceptation, refus, expiration, conversion unique en commande.
- **Clients professionnels** : répertoire, fiche (identifiants, contacts, statut « vérifiée » posé par vous, conditions convenues, notes internes), commandes et devis liés, lien de l’espace pro.
- **Fidélité** : désactivée tant que vos règles ne sont pas saisies et validées. Points sur le montant encaissé au retrait, une fois par commande ; ajustements motivés, utilisation de la récompense, historique.
- **Équipe et journal** (propriétaire) : comptes collaborateurs (commandes, devis, produits ; pas les réglages, la fidélité ni la sauvegarde) et journal d’audit de toutes les actions.
- **Plus** : informations de la boutique, réseaux sociaux, horaires et créneaux (délai, jour même, capacité, fermetures), notifications, apparence, sécurité, sauvegarde, installation sur iPhone, et liste des points à régler avant la mise en ligne.

Les nouvelles commandes arrivent sans recharger la page : l’app vérifie toutes les 20 secondes et à chaque retour au premier plan. Une alerte s’affiche dans l’app et une pastille apparaît sur l’onglet Commandes et sur l’icône de l’app.

## Règles métier

- **Prix** : recalculés côté serveur, promotion comprise. Si le prix envoyé par le navigateur diffère, la commande est refusée (409).
- **Doublons** : chaque tentative porte un `requestKey`. Un double appui ou une nouvelle tentative réseau renvoie la même commande.
- **Stock** : réservé à l’enregistrement de la commande, dans une transaction exclusive, et rendu en cas d’annulation. Un produit sans suivi de stock dépend seulement de l’interrupteur « disponible ».
- **Promotions** : une quantité maximale facultative, réservée de la même façon. Une promotion disparaît d’elle-même à sa date de fin ou quand elle est épuisée.
- **Retrait** : délai minimum configurable (le lendemain par défaut). Le jour même n’est possible que si tout le panier est « Prêt aujourd’hui ». Chaque créneau a une capacité maximale.
- **Statuts** : Demande reçue → (En attente de validation) → Acceptée → En préparation → Prête → Retirée, ou Annulée. Réception n’est pas acceptation : une demande n’entre en préparation qu’une fois acceptée. Les anciens libellés (Nouvelle, Confirmée) sont convertis à la lecture.
- **Devis** : cycle distinct (Demande reçue, En étude, Devis établi, Envoyé, Accepté, Refusé, Expiré, Converti en commande). Une demande de devis n’est jamais un devis ; un devis ne peut pas être établi avec une ligne sans prix.
- **Articles libres** : aucun tarif n’est déduit d’une désignation ; le prix est `null` (« à confirmer ») jusqu’à sa saisie, jamais 0 €.
- **Fermetures exceptionnelles** : le jour n’est plus proposé ; les commandes déjà prévues ce jour-là sont signalées (Aujourd’hui et Horaires).
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
npm test                      # calculs, créneaux, devis, SIRET, listes, WhatsApp
npx playwright install chromium
NEXT_DIST_DIR=.next-build npm run build
E2E_PROD=1 npm run test:e2e   # 19 parcours sur la version de production (recommandé)
npm run test:e2e              # mêmes parcours sur le serveur de développement
```

## Reste à faire par la boucherie

L’écran Plus → Avant la mise en ligne liste ces points en direct :

- vérifier les horaires, repris de l’ancien site Wix (lun.–ven. 9h–13h et 15h–19h, sam. 9h–19h, dim. 9h–13h) ;
- compléter les mentions légales : forme juridique, responsable de la publication, hébergeur ;
- renseigner l’origine, les allergènes et de vraies descriptions des produits (aucune donnée n’a été inventée) ;
- activer les notifications sur l’iPhone et, si souhaité, ajouter le numéro WhatsApp ;
- prévoir les conditions générales de vente si un paiement en ligne est envisagé un jour ;
- si vous le souhaitez : règles de fidélité, liens Instagram / Facebook / TikTok, comptes collaborateurs.

**Non disponible faute de service configuré** (rien n’est simulé) :

- accusé de réception par e-mail des demandes : aucun service d’envoi d’e-mail n’est branché ; la confirmation à l’écran et le PDF suffisent ;
- lecture automatique (OCR) des photos de commande : la photo est conservée et sert de support à une saisie manuelle ;
- envois WhatsApp/SMS automatiques : voir la section WhatsApp.

## Préparé pour la suite

- **Comptes clients** : les particuliers retrouvent leurs commandes et leur solde de fidélité depuis l’appareil (liens secrets), sans compte ; les professionnels ont un espace par lien privé. Une connexion par code SMS ou e-mail demanderait un service d’envoi.
- **Nouveaux rayons** : charcuterie, traiteur, préparations maison, lots et produits saisonniers existent déjà comme catégories. Ils apparaissent sur le site dès qu’un produit y est rangé.
