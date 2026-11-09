# Boucherie du Faubourg

Site e-commerce de la Boucherie du Faubourg à Amiens, construit avec Next.js, React et TypeScript.

Le site comprend l’accueil, une boutique avec 58 produits, les pages Barbecue, Notre maison et Contact, un panier Click & Collect WhatsApp optimisé pour téléphone et un espace propriétaire pour gérer le catalogue, les photos, les prix et les textes.

## Lancer le site localement

Node.js 22 ou plus récent est nécessaire.

```sh
cd ~/Desktop/Boucherie_web
npm install
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000).

Pour la version de production :

```sh
npm run build
npm start
```

## Espace propriétaire

L’espace de gestion est disponible sur [http://localhost:3000/admin](http://localhost:3000/admin).

Au premier accès, créez l’e-mail et le mot de passe du propriétaire. Le code d’installation se trouve dans `ACCES-ADMIN.txt`. Il sert une seule fois et ce fichier doit rester privé. Il est volontairement exclu de Git avec `.env.local` et les données de la boutique.

Depuis l’espace propriétaire, vous pouvez :

- ajouter, modifier, publier, masquer ou supprimer un produit ;
- changer le nom, prix au kilo, description, informations produit, disponibilité et sélection barbecue ;
- importer une photo de produit ou changer le logo, la photo d’accueil et la photo de présentation ;
- modifier les coordonnées, horaires, textes et informations de la boutique ;
- consulter les demandes de retrait, les confirmer et suivre leur préparation.

Les données sont enregistrées dans `data/boutique.sqlite` et les photos téléversées dans `data/uploads`. Ces dossiers doivent être conservés lors d’un redémarrage ou d’un déploiement. Ils ne sont pas versionnés.

## Fonctionnement des commandes

Le client choisit ses produits et le poids souhaité, puis indique son nom, son téléphone et sa date de retrait. En cliquant sur **Commander sur WhatsApp**, WhatsApp s’ouvre avec sa commande complète, le total estimé et ses précisions déjà rédigés. Il envoie alors le message directement à la boucherie, qui reçoit la commande dans sa conversation WhatsApp et confirme le retrait au même endroit.

## WhatsApp

Dans **Espace propriétaire → Ma boutique**, renseignez le numéro WhatsApp qui doit recevoir les commandes. Utilisez de préférence le format international (`+33…`). Une fois enregistré, le Click & Collect dirige les clients vers ce numéro avec leur panier déjà écrit. Aucun compte Meta ni réglage technique n’est nécessaire pour ce parcours.

Le site ne collecte pas de paiement. Avant une ouverture commerciale, ajoutez les conditions de vente définitives, les horaires vérifiés, les informations allergènes et provenance, la durée de conservation des données et, si nécessaire, un paiement en ligne.

## Déploiement

Le site a besoin d’un hébergement Node.js 22 avec un disque persistant, car le catalogue, les commandes et les photos sont stockés localement dans SQLite. Conservez ces deux variables dans l’environnement de production :

```sh
ADMIN_SETUP_TOKEN=un-code-long-et-secret
APP_ORIGIN=https://votre-domaine.fr
```

Optionnellement, définissez `BOUCHERIE_DATA_DIR` vers le volume persistant de votre hébergeur. Utilisez toujours HTTPS en production.

## Vérifications

```sh
npm run typecheck
npm test
npx playwright install chromium
npm run test:e2e
npm run build
```

Les tests couvrent les calculs au poids, les dates de retrait au fuseau horaire d’Amiens, les pages et filtres, l’espace propriétaire, l’import d’image, la protection des modifications, le panier WhatsApp, la persistance et l’affichage mobile.
