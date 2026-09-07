# blogueur_ia_python

Module de blog éditorial autonome piloté par IA : rédaction, illustration (images/
vidéos/cartes via Serper), backlinks SEO réels, garde-fou anti-auto-promotion,
publication — packagé pour être cloné et branché dans n'importe quel projet FastAPI + Celery.
Version Python

## Installation

```bash
pip install -r requirements.txt
cp .env.example .env
cp blogueur_ia.conf.example blogueur_ia.conf
```

Éditez `.env` (secrets : DB, Serper, LLM) et `blogueur_ia.conf` (marque, style,
catégories, stockage — rien n'est codé en dur ailleurs).

Si vous parlez de VOTRE produit dans certains articles, créez un fichier YAML
factuel (fondateur, prix, fonctionnalités réelles) et pointez `[fiche_technique] path`
vers lui dans le `.conf` — c'est la seule source de vérité autorisée pour ces sujets.

## Initialisation de la base

```python
import asyncio
from blogueur_ia.db import init_db
asyncio.run(init_db())
```

(Pour un usage en production avec migrations versionnées, remplacez par Alembic.)

## Intégration dans votre `main.py`

```python
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from blogueur_ia.routes.public import router as blog_public_router
from blogueur_ia.routes.admin import build_admin_router
from blogueur_ia.config import settings
from your_app.auth import get_current_admin  # votre dépendance d'auth existante

app = FastAPI()

app.include_router(blog_public_router)
app.include_router(build_admin_router(auth_dependency=get_current_admin))

app.mount("/uploads/blog", StaticFiles(directory=settings.storage_dir), name="blog_media")
```

## Intégration Celery

Le task est un `@shared_task` — il s'enregistre automatiquement dès que
`blogueur_ia.tasks` est importé quelque part dans le process qui exécute votre
worker Celery. Rien à faire de plus que :

```python
import blogueur_ia.tasks  # noqa — enregistre la tâche sur votre app Celery existant
```

## Endpoints exposés

- `GET  /api/blog/articles` — liste publique
- `GET  /api/blog/articles/{slug}` — détail public
- `GET  /api/blog/articles/{slug}/suggestions` — articles similaires
- `GET  /admin/blog` — liste admin (tous statuts)
- `GET  /admin/blog/categories` — catégories configurées
- `POST /admin/blog/generate` — génération IA (asynchrone via Celery)
- `POST /admin/blog/draft-from-release` — brouillon manuel depuis une sortie produit
- `DELETE /admin/blog/{slug}` — suppression