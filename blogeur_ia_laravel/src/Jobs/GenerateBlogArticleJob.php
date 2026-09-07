<?php

namespace BlogueurIa\Jobs;

use BlogueurIa\Models\BlogArticle;
use BlogueurIa\Services\BlogAiService;
use BlogueurIa\Services\BlogService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Log;

class GenerateBlogArticleJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1;
    public int $timeout = 600; // génération LLM + Serper multi-étapes, peut prendre du temps

    public function __construct(
        private string $promptAdmin,
        private string $categorie,
        private ?string $adminEmail,
        private bool $autoPublish,
    ) {
        $this->onConnection(Config::get('blogueur_ia.queue.connection'));
        $this->onQueue(Config::get('blogueur_ia.queue.queue', 'blogueur-ia'));
    }

    public function handle(BlogAiService $aiService, BlogService $blogService): void
    {
        try {
            $data = $aiService->genererArticleIa($this->promptAdmin, $this->categorie);

            $article = $blogService->creerArticle([
                'titre' => $data['titre'],
                'chapo' => $data['chapo'],
                'contenu_html' => $data['contenu_html'],
                'categorie' => $data['categorie'],
                'tags' => $data['mots_cles_seo'],
                'auteur' => $this->adminEmail ?: 'IA',
                'created_by' => $this->adminEmail ?: 'admin_ia',
                'source' => 'ia_admin',
                'image_couverture_url' => $data['image_couverture_url'],
                'publier_immediatement' => $this->autoPublish,
            ]);

            $article->update([
                'liens_externes' => $data['liens_externes'],
                'images_meta' => $data['blocs_media'],
                'mots_cles_seo' => $data['mots_cles_seo'],
                'meta_title' => $data['meta_title'],
                'meta_description' => $data['meta_description'],
            ]);
        } catch (\Throwable $e) {
            Log::error('Erreur génération article IA', ['exception' => $e]);
            throw $e;
        }
    }
}