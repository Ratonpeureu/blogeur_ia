<?php

namespace BlogueurIa\Services;

use Illuminate\Support\Facades\Config;

class BlogAutoService
{
    public function __construct(private BlogService $blogService) {}

    public function creerBrouillonDepuisSortie(string $titreFeature, string $descriptionFeature, ?string $categorie = null): void
    {
        $brand = Config::get('blogueur_ia.brand');
        $cat = $categorie ?? Config::get('blogueur_ia.categories.categorie_produit_id');

        $contenuHtml = "<p>{$descriptionFeature}</p>"
            ."<p>Cette fonctionnalité est désormais disponible sur {$brand['name']}.</p>";

        $this->blogService->creerArticle([
            'titre' => "Nouveauté : {$titreFeature}",
            'chapo' => mb_substr($descriptionFeature, 0, 160),
            'contenu_html' => $contenuHtml,
            'categorie' => $cat,
            'tags' => ['nouveaute', 'produit'],
            'auteur' => $brand['author_default'],
            'created_by' => 'system_auto',
            'source' => 'auto_release',
            'publier_immediatement' => false,
        ]);
    }
}