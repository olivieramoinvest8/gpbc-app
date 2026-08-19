# 🏀 GPBC Graveson — Contexte du projet

Site officiel du **Graveson Provence Basket Club**, club de basket **100 % féminin**
à Graveson (13690). Site en ligne : **https://gpbc-graveson.fr** et
**https://www.gpbc-graveson.fr**.

Ce fichier donne le contexte que le code seul ne raconte pas — lis-le avant
de faire des changements, surtout côté hébergement/DNS/base de données.

## Architecture technique

| Composant | Détail |
|---|---|
| **Dépôt GitHub** | `olivieramoinvest8/gpbc-app`, branche `main` (déployée en prod) |
| **Hébergement** | Cloudflare Workers (site statique), projet **`gpbc-app`** — PAS Netlify (abandonné en cours de route), PAS `sitegpbc` (délaissé aussi) |
| **Compte Cloudflare** | Celui d'Olivier (« AMO Invest »), qui héberge aussi son autre Worker `app-dimanche` — les deux coexistent, ne pas les mélanger |
| **Domaine** | `gpbc-graveson.fr`, acheté chez OVH, DNS géré chez Cloudflare (nameservers `greg.ns.cloudflare.com` / `magali.ns.cloudflare.com`) |
| **Base de données** | Le projet Supabase de l'app **Dimanche** (id `hnauzixjohonfujgydzy`) — PAS de base séparée. `club_id` GPBC = `1420ace7-f0e0-402e-8288-8a6ec7dbd45a` |
| **Déploiement** | `wrangler.jsonc` à la racine sert les fichiers statiques depuis `.`. Chaque `git push` sur `main` redéploie automatiquement via l'intégration GitHub ↔ Cloudflare |

## Structure du site

```
index.html       Accueil : scène 3D (parquet FIBA, ballon qui tourne, aigle du logo, menu)
club.html         Présentation, valeurs, horaires (lit site_entrainements)
equipes.html      Photos d'équipes par saison (lit/gère site_equipes)
calendrier.html   Matchs en direct de Dimanche (site_matchs) + partage + affiches
evenements.html   Événements du club (site_evenements) + partage + affiches
inscription.html  Bouton d'inscription en ligne via l'app Dimanche (lien codé en dur,
                  club b52842ca-0945-48ea-81d8-eb26b3081c86) — HelloAsso abandonné
contact.html      Adresse, e-mail, réseaux sociaux (site_contenus)
admin.html        Espace privé (connexion compte Dimanche) pour éditer textes/liens/photos
assets/           style.css, site.js (connexion Supabase), polices, logo, aigle,
                  ballon.glb (modèle 3D), three.min.js, GLTFLoader.js, supabase.js, og.jpg
```

## La scène 3D de l'accueil

- **Terrain** : dimensions FIBA réelles (28×15 m), rond central (liseré rouge club),
  ligne à 3 points, raquette teintée rouge, panier 3D complet
- **Ballon** : un vrai modèle 3D téléchargé sur Sketchfab (« BASKETBALL » par **iturrospe**,
  licence CC — crédité en bas de page, obligatoire). PAS un ballon dessiné à la main
  (première tentative jugée pas assez réaliste). Textures compressées ~600 Ko.
- **Aigle** : détouré à partir du vrai logo du club, posé en fondu sur le ballon
- **Devise affichée** : « Club 100 % féminin »
- Menu : Le Club / Équipes / Calendrier / Événements / Inscription / Contact

## Base de données — ce qui existe déjà

Migration appliquée : `site_gpbc_vues_publiques_et_contenus`

- **Vues publiques lecture seule** (filtrées club GPBC, rien de sensible) :
  `site_matchs`, `site_evenements`, `site_entrainements`
- **`site_contenus`** (clé/valeur) : présentation, valeurs, adresse gymnase,
  e-mail/tél contact, lien HelloAsso, Facebook, Instagram, saison affichée,
  texte inscription
- **`site_equipes`** : photos d'équipes par saison
- **Bucket public `site-public`** pour les photos uploadées depuis l'admin
- RLS : lecture publique, écriture réservée aux comptes connectés (comptes Dimanche)

⚠️ La connexion à `/admin.html` se fait avec un **compte de l'app Dimanche**
(`bdd.auth.signInWithPassword`) — pas de système de comptes séparé.

## Pièges déjà résolus (ne pas refaire les mêmes erreurs)

1. **Netlify abandonné** : un ancien projet (`sitegpbc`) avait une zone DNS
   fantôme bloquante liée à un vieux compte inaccessible. Décision : tout
   migrer vers Cloudflare (hébergement + DNS).
2. **E-mails du club** : MX/SPF chez OVH — toujours vérifier qu'ils restent
   intacts après toute manip DNS.
3. **Workers Routes + DNS fantôme** : pour qu'un Worker réponde sur un domaine
   personnalisé sans utiliser "Custom Domains", il faut un enregistrement DNS
   **proxifié** (nuage orange) même factice — `AAAA` → `100::` — sur `@` et `www`,
   + des Routes au format `domaine.fr/*` (avec le `/*`, sinon ça ne matche rien).
   C'est le montage actuellement en place et qui fonctionne.
4. Le tableau de bord Cloudflare était souvent affiché **traduit automatiquement
   en français par Chrome**, ce qui rend les boutons méconnaissables — conseiller
   de désactiver la traduction auto si problème de navigation.

## Limites connues de l'environnement Claude Code ici

- Domaines bloqués par le pare-feu sortant : `workers.dev`, `sketchfab.com`,
  `skfb.ly`, certains CDN — pour tout ce qui touche des assets externes,
  demander à l'utilisateur de télécharger et d'envoyer le fichier directement.
- Le connecteur Cloudflare disponible est **lecture seule** pour les Workers
  (pas de création/déploiement, pas de DNS, pas de Custom Domain) — toute
  config Cloudflare doit être guidée pas à pas dans l'interface web avec
  l'utilisateur.
- Le connecteur Netlify n'a pas non plus d'outil d'écriture DNS.

## À faire (prochaines étapes)

1. Remplir le contenu réel dans `site_contenus` (via `/admin.html` ou
   directement en base) : e-mail de contact réel, téléphone, adresse précise
   du gymnase, liens Facebook/Instagram. (L'inscription passe désormais par
   le lien Dimanche codé en dur dans `inscription.html` — la clé
   `lien_helloasso` en base ne sert plus.)
2. Ajouter les photos d'équipes de la saison en cours via `/admin.html`.
3. Vérifier que `site_matchs` / `site_evenements` / `site_entrainements` se
   peuplent bien à mesure qu'Olivier les saisit dans Dimanche (testé
   uniquement avec des données simulées jusqu'ici).
4. Optionnel : nettoyer les projets Netlify (`sitegpbc`) et Cloudflare
   inutilisés.
