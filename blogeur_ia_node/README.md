# blogueur-ia (Node.js)

Module de blog éditorial autonome piloté par IA — rédaction, illustration
(images/vidéos/cartes via Serper), backlinks SEO réels, garde-fou anti-auto-
promotion, publication. Packagé pour être cloné et branché dans n'importe
quel projet Express + BullMQ/Redis.

## Installation

```bash
npm install
npm run build
cp .env.example .env
cp blogueur_ia.conf.example blogueur_ia.conf
```

Adaptez `.env` (DB, Redis, Serper, LLM) et `blogueur_ia.conf` (marque, style,
catégories, stockage). Rien n'est codé en dur ailleurs.

## Initialisation de la base

```typescript
import { initDb } from "blogueur-ia/dist/db";
await initDb();
```

## Intégration dans votre app Express

```typescript
import express from "express";
import { publicRouter } from "blogueur-ia/dist/routes/public";
import { buildAdminRouter } from "blogueur-ia/dist/routes/admin";
import { yourAdminAuthMiddleware } from "./your-auth";
import { settings } from "blogueur-ia/dist/config";

const app = express();
app.use(express.json());

app.use(publicRouter);
app.use(buildAdminRouter({ authMiddleware: yourAdminAuthMiddleware }));
app.use("/uploads/blog", express.static(settings.storageDir));
```

## Worker (équivalent Celery)

Lancez le worker dans le process dédié à vos tâches de fond (ou en standalone) :

```typescript
import { startArticleWorker } from "blogueur-ia/dist/queue";
startArticleWorker();
```

Nécessite Redis (`REDIS_URL` dans `.env`).

## Endpoints exposés

- `GET  /api/blog/articles`
- `GET  /api/blog/articles/:slug`
- `GET  /api/blog/articles/:slug/suggestions`
- `GET  /admin/blog`
- `GET  /admin/blog/categories`
- `POST /admin/blog/generate`
- `POST /admin/blog/draft-from-release`
- `DELETE /admin/blog/:slug`