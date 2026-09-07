# Blogueur IA — Module de blog éditorial autonome

**Blogueur IA** est un module de blog éditorial autonome piloté par intelligence artificielle. Il rédige des articles complets, les illustre avec des médias trouvés sur le web (images, vidéos, cartes) via **Serper**, insère de vrais backlinks SEO, applique un garde-fou anti‑auto‑promotion et publie le tout automatiquement ou en brouillon.

Ce dépôt contient **trois implémentations interchangeables**, prêtes à être intégrées dans votre stack existante :

| Langage / Stack | Dossier | Framework | File d’attente | Base de données |
|----------------|---------|-----------|----------------|-----------------|
| **PHP**        | `blogeur_ia_laravel` | Laravel | Queue Laravel (Redis, Database…) | Eloquent / MySQL, PostgreSQL… |
| **Node.js**    | `blogeur_ia_node`    | Express  | BullMQ (Redis) | Sequelize / tout support SQL |
| **Python**     | `blogeur_ia_python`  | FastAPI  | Celery (Redis) | SQLAlchemy (async) / PostgreSQL, SQLite… |

Chaque version est autonome, configurable par un fichier de configuration dédié, et s’intègre en quelques lignes dans une application hôte existante.

---

## Fonctionnalités communes

- **Rédaction par IA** : génération d’articles longs et structurés à partir d’un simple sujet.
- **Illustration automatique** : recherche d’images, vidéos ou cartes via l’API Serper et insertion dans l’article.
- **Backlinks SEO réels** : ajout de liens sortants vers des sources pertinentes (forums, articles, documentation).
- **Garde-fou anti‑auto‑promotion** : aucune mention de votre propre produit n’est autorisée, sauf si une fiche technique factuelle est fournie et explicitement référencée dans la configuration.
- **Publication asynchrone** : la génération est poussée dans une file d’attente, l’API répond immédiatement avec un `job_id`.
- **API publique et admin** : endpoints pour lister/lire les articles, générer, supprimer, etc.
- **Stockage des médias** : téléchargement local des illustrations ou utilisation d’URL distantes selon configuration.

---

## Architecture conceptuelle

Chaque implémentation suit le même découpage :

- **Service IA** (`BlogAiService`) : orchestration de la génération, appel au LLM, enrichissement SEO.
- **Service Auto** (`BlogAutoService`) : logique de génération automatique complète (recherche, rédaction, illustration, backlinks).
- **Client Serper** : wrapper autour de l’API Google Serper pour la recherche web.
- **Client LLM** : abstraction pour appeler n’importe quel modèle compatible (OpenAI, Anthropic, etc.).
- **Garde-fou** (`PromoGuard`) : vérifie qu’aucune mention non autorisée de la marque n’est présente.
- **Médias** (`MediaStorage`) : gestion du téléchargement et du stockage des illustrations.
- **Base de données** : modèle unique `BlogArticle` avec statuts (`draft`, `published`, `generating`, `failed`).
- **Configuration** : fichier de configuration central (`.conf` ou `config/`) qui contient la marque, le style rédactionnel, les catégories, les chemins de stockage, etc.

---

## Arborescence du dépôt

blogeur_ia/
├── blogeur_ia_laravel/ # Version PHP / Laravel
├── blogeur_ia_node/ # Version Node.js / Express + BullMQ
├── blogeur_ia_python/ # Version Python / FastAPI + Celery
└── README.md # Ce fichier


Chaque sous-dossier contient son propre `README.md` avec les instructions d’installation spécifiques, les endpoints exposés et les exemples d’intégration.

---

## Choisir sa version

- **Vous utilisez Laravel** → `blogeur_ia_laravel`
- **Vous utilisez Node.js (Express, NestJS, etc.)** → `blogeur_ia_node`
- **Vous utilisez Python (FastAPI, Django, etc.)** → `blogeur_ia_python`

Toutes les versions offrent les mêmes fonctionnalités ; seuls le langage, le framework et la file d’attente diffèrent.

---

## Prérequis communs

Quelle que soit la version choisie, vous aurez besoin de :

- Une clé API **Serper** ([serper.dev](https://serper.dev)) pour la recherche d’illustrations et de sources.
- Une clé API **LLM** compatible (OpenAI, Anthropic, ou tout endpoint OpenAI-compatible).
- Une base de données (PostgreSQL, MySQL, SQLite… selon la version).
- Redis **uniquement** pour les versions Node.js et Python (BullMQ / Celery). Pour Laravel, Redis est facultatif mais recommandé.

---

## Installation rapide

### Version Laravel

```bash
cd blogeur_ia_laravel
# Suivez les instructions du README.md local
