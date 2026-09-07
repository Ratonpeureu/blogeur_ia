<?php

namespace BlogueurIa\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class BlogArticle extends Model
{
    use HasUuids;

    protected $table = 'blog_articles';

    protected $fillable = [
        'slug', 'titre', 'chapo', 'contenu_html', 'categorie', 'tags',
        'image_couverture_url', 'auteur', 'statut', 'source',
        'meta_title', 'meta_description', 'liens_externes', 'images_meta',
        'mots_cles_seo', 'date_publication', 'created_by',
    ];

    protected $casts = [
        'tags' => 'array',
        'liens_externes' => 'array',
        'images_meta' => 'array',
        'mots_cles_seo' => 'array',
        'date_publication' => 'datetime',
    ];
}