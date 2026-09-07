# blogueur-ia (Laravel)

Module de blog éditorial autonome piloté par IA — rédaction, illustration
(images/vidéos/cartes via Serper), backlinks SEO réels, garde-fou anti-auto-
promotion, publication. Packagé comme package Composer autonome, branchable
dans n'importe quelle app Laravel existante.

## Installation

En local (avant publication sur Packagist), ajoutez dans le `composer.json`
de votre app hôte :

```json
"repositories": [
    { "type": "path", "url": "../blogueur-ia" }
],
"require": {
    "votre-vendor/blogueur-ia": "*"
}
```

Puis :

```bash
composer update
php artisan vendor:publish --tag=blogueur-ia-config
php artisan migrate
```

Complétez votre `.env` avec les clés de `.env.example` (SERPER_API_KEY,
LLM_API_KEY...), et adaptez `config/blogueur_ia.php` (marque, style, catégories,
stockage) — c'est la seule source de vérité comportementale, rien n'est codé
en dur ailleurs.

## Stockage des images

Le disque utilisé est celui configuré dans `storage.disk` (par défaut `public`).
Assurez-vous d'avoir fait `php artisan storage:link` si vous utilisez le disque
`public` standard, et que `storage.base_url` pointe vers l'URL publique réelle.

## Routes

Les routes **publiques** sont chargées automatiquement par le Service Provider.

Les routes **admin** ne sont volontairement PAS chargées automatiquement —
à vous d'appliquer votre propre middleware d'authentification :

```php
// routes/web.php ou routes/api.php de votre app
Route::middleware(['auth:sanctum', 'admin'])
    ->group(base_path('vendor/votre-vendor/blogueur-ia/routes/admin.php'));
```

## Génération d'articles (Queue Laravel)

La génération est dispatchée sur la queue Laravel (`config('blogueur_ia.queue')`).
Démarrez un worker comme d'habitude :

```bash
php artisan queue:work --queue=blogueur-ia
```

Si vous voulez suivre une génération, écoutez l'événement `JobProcessed` /
`JobFailed` standard de Laravel, ou stockez le `job_id` retourné pour du
polling côté admin.

## Endpoints exposés

- `GET  /api/blog/articles`
- `GET  /api/blog/articles/{slug}`
- `GET  /api/blog/articles/{slug}/suggestions`
- `GET  /admin/blog`
- `GET  /admin/blog/categories`
- `POST /admin/blog/generate`
- `POST /admin/blog/draft-from-release`
- `DELETE /admin/blog/{slug}`