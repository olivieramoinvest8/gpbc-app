# 🏀 GPBC — Graveson Provence Basket Club

Site officiel du club : **www.gpbc-graveson.fr** — club de basket 100 % féminin à Graveson (13690).

## Comment ça marche

- **Page d'accueil** (`index.html`) : scène 3D (terrain, ballon, aigle du logo) et menu.
- **Pages de contenu** : Le Club, Équipes, Calendrier, Événements, Inscription, Contact.
- **Données en temps réel** : les matchs, événements et entraînements sont lus directement
  dans la base de l'app **Dimanche** (vues publiques en lecture seule, filtrées sur le club).
  On planifie un match dans Dimanche → il apparaît sur le site.
- **Espace admin** (`admin.html`) : connexion avec le compte Dimanche, pour modifier les
  textes, les liens (HelloAsso, réseaux) et les photos d'équipes de chaque saison.
- **Partage** : chaque match ou événement peut être partagé sur les réseaux, avec une
  affiche générée automatiquement aux couleurs du club.

## Déploiement

Hébergé sur **Cloudflare** (site statique, aucun build), relié au dépôt GitHub :
chaque fusion sur `main` met le site en ligne automatiquement.
Domaine : `www.gpbc-graveson.fr` (zone DNS gérée dans le même compte Cloudflare).

## Crédits

Ballon 3D : « BASKETBALL » par iturrospe (Sketchfab, licence Creative Commons).
