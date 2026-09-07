#  Blogueur IA

### Module de blog éditorial autonome piloté par intelligence artificielle

<p align="center">
  <strong>Rédaction IA · SEO · Médias · Backlinks · Publication automatisée</strong>
</p>

---

##  Présentation

**Blogueur IA** est un module de blog éditorial autonome piloté par intelligence artificielle.

Il permet de :

*  Générer des articles complets à partir d'un sujet
*  Rechercher et intégrer automatiquement des médias
*  Ajouter de vrais backlinks SEO
*  Éviter l'auto-promotion excessive grâce à **PromoGuard**
*  Générer les contenus de manière asynchrone
*  Publier automatiquement ou conserver les articles en brouillon

Les médias — **images, vidéos et cartes** — sont recherchés via **Serper**.

---

##  Trois implémentations

Le dépôt contient **trois implémentations interchangeables**, conçues pour s'intégrer dans une stack existante.

| Stack          | Dossier              | Framework | File d'attente | Base de données  |
| -------------- | -------------------- | --------- | -------------- | ---------------- |
| 🐘 **PHP**     | `blogeur_ia_laravel` | Laravel   | Queue Laravel  | Eloquent         |
| 🟢 **Node.js** | `blogeur_ia_node`    | Express   | BullMQ + Redis | Sequelize / SQL  |
| 🐍 **Python**  | `blogeur_ia_python`  | FastAPI   | Celery + Redis | SQLAlchemy async |

Chaque version possède sa propre configuration et son propre README d'installation.

---

#  Fonctionnalités

###  Rédaction par IA

Génération d'articles longs et structurés à partir d'un simple sujet.

###  Illustration automatique

Recherche d'illustrations via l'API **Serper** :

* Images
* Vidéos
* Cartes

Les médias peuvent être téléchargés localement ou utilisés directement depuis leurs URLs selon la configuration.

###  Backlinks SEO

Ajout de liens sortants vers des sources pertinentes :

* Articles
* Documentation
* Forums
* Sources web pertinentes

###  PromoGuard

**PromoGuard** constitue le garde-fou anti-auto-promotion du module.

Il empêche qu'un article soit systématiquement orienté vers votre produit ou votre service.

Le système bloque automatiquement les mentions non autorisées de la marque, sauf lorsque :

* le sujet nécessite explicitement cette mention ;
* une fiche technique factuelle est fournie dans la configuration.

L'objectif est de conserver un contenu éditorial **informatif et crédible**.

### ⚡ Génération asynchrone

La génération des articles est envoyée dans une file d'attente.

L'API répond immédiatement avec un `job_id`.

###  API publique et administration

Endpoints permettant notamment de :

* lister les articles ;
* consulter un article ;
* générer un article ;
* supprimer un article ;
* gérer les différents états des contenus.

---

#  Architecture

Les trois implémentations suivent le même découpage conceptuel.

```text
                    ┌─────────────────────┐
                    │      Blogueur IA    │
                    └──────────┬──────────┘
                               │
             ┌─────────────────┼─────────────────┐
             │                 │                 │
             ▼                 ▼                 ▼
      ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
      │ BlogAiService│   │BlogAutoService│ │  PromoGuard │
      └──────┬──────┘   └──────┬──────┘   └─────────────┘
             │                 │
             │          ┌──────┴──────┐
             │          │             │
             ▼          ▼             ▼
       ┌──────────┐ ┌──────────┐ ┌─────────────┐
       │   LLM    │ │  Serper  │ │MediaStorage │
       └──────────┘ └──────────┘ └─────────────┘
             │
             ▼
       ┌──────────────┐
       │ BlogArticle  │
       └──────────────┘
```

### Services principaux

| Composant         | Rôle                                                  |
| ----------------- | ----------------------------------------------------- |
| `BlogAiService`   | Orchestration de la génération et enrichissement SEO  |
| `BlogAutoService` | Génération automatique complète                       |
| `Serper Client`   | Recherche web via l'API Google Serper                 |
| `LLM Client`      | Abstraction permettant d'appeler un modèle compatible |
| `PromoGuard`      | Contrôle des mentions de marque                       |
| `MediaStorage`    | Téléchargement et stockage des médias                 |
| `BlogArticle`     | Modèle de stockage des articles                       |

---

#  Structure du dépôt

```text
blogeur_ia/
│
├── blogeur_ia_laravel/
│   └── README.md
│
├── blogeur_ia_node/
│   └── README.md
│
├── blogeur_ia_python/
│   └── README.md
│
└── README.md
```

Chaque sous-dossier contient son propre `README.md` avec les instructions spécifiques à l'implémentation.

---

#  Choisir son implémentation

### Laravel

```bash
cd blogeur_ia_laravel
```

### Node.js

```bash
cd blogeur_ia_node
```

### Python

```bash
cd blogeur_ia_python
```

Les trois versions proposent les mêmes fonctionnalités principales. Seuls la stack technique et les systèmes de file d'attente diffèrent.

---

#  Prérequis

Quelle que soit l'implémentation choisie, le module nécessite :

* Une clé API **Serper**
* Une clé API **LLM compatible**
* Une base de données adaptée à l'implémentation

### Redis

Redis est utilisé pour :

* **BullMQ** avec Node.js
* **Celery** avec Python

Pour Laravel, Redis est facultatif mais recommandé.

---

#  Configuration Nginx / Apache

Pour permettre l'affichage des vidéos intégrées et des cartes, le serveur web doit autoriser les iframes correspondantes.

## Nginx

Dans le bloc `server` ou `location` :

```nginx
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://static.cloudflareinsights.com https://www.googletagmanager.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob: https://www.google-analytics.com https://images.unsplash.com https://www.google.com https://*.gstatic.com https://*.tile.openstreetmap.org; connect-src 'self' https://www.google-analytics.com https://region1.google-analytics.com https://static.cloudflareinsights.com https://rhmanager.site; frame-src 'self' blob: https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com; frame-ancestors 'self'; object-src 'self' blob:;" always;

add_header X-Frame-Options "SAMEORIGIN" always;
```

> **Important :** `X-Frame-Options: SAMEORIGIN` n'empêche pas votre site d'intégrer des iframes externes. La directive `frame-src` de la CSP contrôle les domaines pouvant être intégrés.

## Apache

Dans `.htaccess` ou la configuration du VirtualHost :

```apache
Header set Content-Security-Policy "default-src 'self'; frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com; img-src 'self' data: https:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"

Header set X-Frame-Options "SAMEORIGIN"
```

Le module `mod_headers` doit être activé.

```bash
sudo a2enmod headers
```

---

#  SEO

##  Fréquence de publication

Évitez de publier trop d'articles en peu de temps.

Une fréquence progressive est recommandée :

```text
1 article
   │
   ├── Tous les 2–3 jours
   │
   └── Puis augmentation progressive
```

Alternez également les catégories afin de conserver une couverture éditoriale variée.

---

##  Qualité des prompts

Un sujet trop vague produit généralement un contenu générique.

❌ Exemple vague :

```text
Parler de la sécurité.
```

✅ Exemple détaillé :

```text
Rédige un article sur les meilleures pratiques pour sécuriser
une application web en 2025, destiné à des développeurs débutants.

Aborde les failles les plus courantes :
- injection SQL
- XSS
- CSRF

Présente également les outils de scan et les bonnes pratiques
de codage.

Utilise des exemples concrets.
Ne mentionne aucun produit commercial.

Ton informatif mais accessible.
Première personne du singulier.
```

Il est également recommandé d'indiquer :

* le sujet exact ;
* l'angle ;
* le public visé ;
* les points à traiter ;
* les questions auxquelles répondre ;
* le ton ;
* la longueur approximative ;
* les mots-clés ciblés.

---

#  Sitemap & rendu HTML

Le module ne fournit pas de sitemap dynamique par défaut.

Il appartient à l'application hôte de générer son sitemap afin de faciliter la découverte des nouveaux articles.

### Laravel

Utiliser par exemple :

```text
spatie/laravel-sitemap
```

### Node.js

Créer une route dédiée permettant de générer `sitemap.xml`.

### Python

Utiliser `fastapi-sitemap` ou générer le fichier manuellement.

---

## HTML des articles

Les articles sont stockés en HTML complet dans :

```text
contenu_html
```

L'application hôte doit servir ce HTML sur les URLs publiques afin que les moteurs puissent indexer correctement le contenu.

Pour les applications SPA, prévoir du **Server-Side Rendering** ou du **pré-rendu**.

---

#  Configuration

Le fichier de configuration constitue la source de vérité du module.

Il contient notamment :

```text
Marque
│
├── Nom
├── Mots-clés surveillés
│
Style rédactionnel
│
├── Secteur
├── Longueur
├── Interdits
│
Catégories
│
├── Catégories éditoriales
│
Stockage
│
├── Médias
│
API
│
├── Serper
└── LLM
```

Selon l'implémentation, la configuration se trouve notamment dans :

```text
blogueur_ia.conf
config/blogueur_ia.php
```

Une configuration cohérente est importante pour obtenir des articles adaptés au secteur, aux catégories et aux objectifs SEO.

---

# 🗄️ États des articles

Le modèle `BlogArticle` utilise notamment les statuts suivants :

```text
draft
published
generating
failed
```

---

#  Contribution

Les trois implémentations sont maintenues en parallèle.

Toute amélioration fonctionnelle doit être répliquée dans les trois versions ou documentée comme spécifique à une stack.

---

#  Licence

**MIT**

Voir les fichiers de licence présents dans chaque sous-dossier.

---

#  Avertissement

L'utilisation de Blogueur IA implique des appels à des API tierces, notamment **Serper** et les fournisseurs de **LLM**.

Il est nécessaire de respecter leurs conditions d'utilisation et de prendre en compte les coûts associés.
