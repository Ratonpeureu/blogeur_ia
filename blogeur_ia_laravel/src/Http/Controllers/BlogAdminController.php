<?php

namespace BlogueurIa\Http\Controllers;

use BlogueurIa\Jobs\GenerateBlogArticleJob;
use BlogueurIa\Services\BlogAutoService;
use BlogueurIa\Services\BlogService;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Str;

class BlogAdminController extends Controller
{
    public function __construct(
        private BlogService $blogService,
        private BlogAutoService $autoService,
    ) {}

    public function categories()
    {
        return response()->json(Config::get('blogueur_ia.categories.ids_labels'));
    }

    public function index(Request $request)
    {
        $articles = $this->blogService->listArticlesAdmin(
            $request->query('statut'),
            20,
            ((int) $request->query('page', 1) - 1) * 20
        );

        return response()->json($articles->map(fn ($a) => [
            'slug' => $a->slug, 'titre' => $a->titre, 'chapo' => $a->chapo,
            'categorie' => $a->categorie, 'statut' => $a->statut, 'source' => $a->source,
            'image' => $a->image_couverture_url,
            'date' => $a->date_publication?->toIso8601String(),
            'created_at' => $a->created_at->toIso8601String(),
        ]));
    }

    public function draftFromRelease(Request $request)
    {
        $validated = $request->validate([
            'titre' => 'required|string',
            'description' => 'required|string',
            'categorie' => 'nullable|string',
        ]);

        $this->autoService->creerBrouillonDepuisSortie(
            $validated['titre'], $validated['description'], $validated['categorie'] ?? null
        );

        return response()->json(['status' => 'brouillon créé — à relire et publier manuellement']);
    }

    public function generate(Request $request)
    {
        $validated = $request->validate([
            'prompt' => 'required|string',
            'categorie' => 'nullable|string',
            'auto_publish' => 'nullable|boolean',
        ]);

        $categorie = $validated['categorie'] ?? Config::get('blogueur_ia.categories.categorie_defaut');
        $autoPublish = $validated['auto_publish'] ?? true;
        $adminEmail = $request->user()?->email ?? $request->user()?->username;

        $jobId = (string) Str::uuid();
        GenerateBlogArticleJob::dispatch($validated['prompt'], $categorie, $adminEmail, $autoPublish);

        return response()->json(['task_id' => $jobId, 'status' => 'génération lancée']);
    }

    public function destroy(string $slug)
    {
        $this->blogService->supprimerArticle($slug);
        return response()->json(['status' => 'article supprimé']);
    }
}