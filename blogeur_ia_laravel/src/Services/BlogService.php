<?php

namespace BlogueurIa\Services;

use BlogueurIa\Models\BlogArticle;
use BlogueurIa\Support\Slugify;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class BlogService
{
    public function generateUniqueArticleSlug(string $titre): string
    {
        $base = Slugify::make($titre, 80);
        $candidate = $base;
        $counter = 2;
        while (BlogArticle::where('slug', $candidate)->exists()) {
            $candidate = "{$base}-{$counter}";
            $counter++;
        }
        return $candidate;
    }

    public function creerArticle(array $input): BlogArticle
    {
        $slug = $this->generateUniqueArticleSlug($input['titre']);
        $publier = $input['publier_immediatement'] ?? false;

        return BlogArticle::create([
            'slug' => $slug,
            'titre' => $input['titre'],
            'chapo' => $input['chapo'],
            'contenu_html' => $input['contenu_html'],
            'categorie' => $input['categorie'],
            'tags' => $input['tags'] ?? [],
            'auteur' => $input['auteur'],
            'image_couverture_url' => $input['image_couverture_url'] ?? null,
            'statut' => $publier ? 'publie' : 'brouillon',
            'source' => $input['source'] ?? 'manuel',
            'created_by' => $input['created_by'],
            'date_publication' => $publier ? now() : null,
        ]);
    }

    public function publierArticle(string $slug): BlogArticle
    {
        $article = BlogArticle::where('slug', $slug)->first();
        if (!$article) {
            throw new NotFoundHttpException('Article introuvable');
        }
        $article->statut = 'publie';
        $article->date_publication = $article->date_publication ?? now();
        $article->save();
        return $article;
    }

    public function getArticlePublie(string $slug): BlogArticle
    {
        $article = BlogArticle::where('slug', $slug)->where('statut', 'publie')->first();
        if (!$article) {
            throw new NotFoundHttpException('Article introuvable');
        }
        return $article;
    }

    public function listArticlesPublies(?string $categorie = null, int $limit = 20, int $offset = 0)
    {
        $query = BlogArticle::where('statut', 'publie');
        if ($categorie) {
            $query->where('categorie', $categorie);
        }
        return $query->orderByDesc('date_publication')->skip($offset)->take($limit)->get();
    }

    public function listArticlesSimilaires(string $slugActuel, int $limit = 4)
    {
        $actuel = BlogArticle::where('slug', $slugActuel)->first();
        if (!$actuel) {
            return collect();
        }

        $resultats = BlogArticle::where('statut', 'publie')
            ->where('slug', '!=', $slugActuel)
            ->where('categorie', $actuel->categorie)
            ->orderByDesc('date_publication')
            ->take($limit)
            ->get();

        if ($resultats->count() < $limit && !empty($actuel->tags)) {
            $deja = $resultats->pluck('id')->push($actuel->id)->all();
            $candidats = BlogArticle::where('statut', 'publie')
                ->whereNotIn('id', $deja)
                ->orderByDesc('date_publication')
                ->take(30)
                ->get();

            $scores = $candidats
                ->map(fn ($a) => ['a' => $a, 'score' => count(array_intersect($a->tags ?? [], $actuel->tags))])
                ->filter(fn ($x) => $x['score'] > 0)
                ->sortByDesc('score');

            foreach ($scores as $entry) {
                if ($resultats->count() >= $limit) {
                    break;
                }
                $resultats->push($entry['a']);
            }
        }

        if ($resultats->count() < $limit) {
            $deja = $resultats->pluck('id')->push($actuel->id)->all();
            $fallback = BlogArticle::where('statut', 'publie')
                ->whereNotIn('id', $deja)
                ->orderByDesc('date_publication')
                ->take($limit - $resultats->count())
                ->get();
            $resultats = $resultats->concat($fallback);
        }

        return $resultats->take($limit)->values();
    }

    public function supprimerArticle(string $slug): void
    {
        $article = BlogArticle::where('slug', $slug)->first();
        if (!$article) {
            throw new NotFoundHttpException('Article introuvable');
        }
        $article->delete();
    }

    public function listArticlesAdmin(?string $statut = null, int $limit = 20, int $offset = 0)
    {
        $query = BlogArticle::query();
        if ($statut) {
            $query->where('statut', $statut);
        }
        return $query->orderByDesc('created_at')->skip($offset)->take($limit)->get();
    }
}