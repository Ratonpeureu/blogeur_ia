<?php

namespace BlogueurIa\Http\Controllers;

use BlogueurIa\Services\BlogService;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class BlogPublicController extends Controller
{
    public function __construct(private BlogService $blogService) {}

    public function index(Request $request)
    {
        $articles = $this->blogService->listArticlesPublies(
            $request->query('categorie'),
            20,
            ((int) $request->query('page', 1) - 1) * 20
        );

        return response()->json($articles->map(fn ($a) => [
            'slug' => $a->slug, 'titre' => $a->titre, 'chapo' => $a->chapo,
            'categorie' => $a->categorie, 'image' => $a->image_couverture_url,
            'date' => $a->date_publication?->toIso8601String(),
        ]));
    }

    public function show(string $slug)
    {
        $a = $this->blogService->getArticlePublie($slug);

        return response()->json([
            'slug' => $a->slug, 'titre' => $a->titre, 'contenu_html' => $a->contenu_html,
            'chapo' => $a->chapo, 'auteur' => $a->auteur, 'categorie' => $a->categorie,
            'image' => $a->image_couverture_url, 'tags' => $a->tags,
            'date' => $a->date_publication?->toIso8601String(),
        ]);
    }

    public function suggestions(string $slug)
    {
        $articles = $this->blogService->listArticlesSimilaires($slug, 4);

        return response()->json($articles->map(fn ($a) => [
            'slug' => $a->slug, 'titre' => $a->titre, 'chapo' => $a->chapo,
            'categorie' => $a->categorie, 'image' => $a->image_couverture_url,
            'date' => $a->date_publication?->toIso8601String(),
        ]));
    }
}