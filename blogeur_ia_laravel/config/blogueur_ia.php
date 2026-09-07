<?php

return [

    'brand' => [
        'name' => env('BLOGUEUR_IA_BRAND_NAME', 'Mon Entreprise'),
        'base_url' => rtrim(env('BLOGUEUR_IA_BASE_URL', 'https://exemple.com'), '/'),
        'author_default' => env('BLOGUEUR_IA_AUTHOR_DEFAULT', 'Équipe Éditoriale'),
        'persona_name' => env('BLOGUEUR_IA_PERSONA_NAME', 'Auteur'),
        'persona_bio' => env('BLOGUEUR_IA_PERSONA_BIO', 'professionnel du secteur, écrivant à la première personne'),
    ],

    'style' => [
        'secteur' => env('BLOGUEUR_IA_SECTEUR', "votre secteur d'activité"),
        'min_words' => (int) env('BLOGUEUR_IA_MIN_WORDS', 900),
        'max_words' => (int) env('BLOGUEUR_IA_MAX_WORDS', 1600),
        'temperature_redaction' => (float) env('BLOGUEUR_IA_TEMP_REDACTION', 0.9),
        'temperature_reecriture' => (float) env('BLOGUEUR_IA_TEMP_REECRITURE', 0.7),
        'interdits' => [
            'en somme', 'il est essentiel de noter', 'de plus', 'par ailleurs',
            'en conclusion', "à l'ère du digital",
        ],
    ],

    'promo_guard' => [
        'enabled' => env('BLOGUEUR_IA_PROMO_GUARD_ENABLED', true),
        'brand_trigger_keywords' => [
            'mon entreprise', 'notre logiciel', 'notre plateforme', 'notre solution',
        ],
        'mentions_interdites' => [
            'chez mon entreprise', 'notre logiciel', 'notre plateforme', 'notre solution',
            'intégré à notre', 'nous avons développé',
        ],
    ],

    'categories' => [
        'ids_labels' => [
            ['id' => 'guide', 'label' => 'Guide pratique'],
            ['id' => 'actualite', 'label' => 'Actualité'],
            ['id' => 'analyse-marche', 'label' => 'Analyse de marché'],
            ['id' => 'reglementation', 'label' => 'Réglementation'],
            ['id' => 'temoignage', 'label' => 'Témoignage'],
            ['id' => 'produit', 'label' => 'Produit & nouveautés'],
        ],
        'categorie_produit_id' => 'produit',
        'categorie_defaut' => 'guide',
    ],

    'mots_cles_seo' => [
        'pool' => [
            'mot-cle-1', 'mot-cle-2', 'mot-cle-3',
        ],
    ],

    'fiche_technique' => [
        // Chemin vers un YAML factuel sur VOTRE produit — seule source de vérité
        // autorisée quand un article parle explicitement de la marque.
        'path' => env('BLOGUEUR_IA_FICHE_TECHNIQUE_PATH', null),
    ],

    'storage' => [
        'disk' => env('BLOGUEUR_IA_STORAGE_DISK', 'public'),
        'directory' => env('BLOGUEUR_IA_STORAGE_DIR', 'blog'),
        'base_url' => rtrim(env('BLOGUEUR_IA_STORAGE_BASE_URL', 'https://exemple.com/uploads/blog'), '/'),
        'max_size_mb' => (int) env('BLOGUEUR_IA_STORAGE_MAX_SIZE_MB', 6),
    ],

    'serper' => [
        'api_key' => env('SERPER_API_KEY', ''),
        'gl' => env('BLOGUEUR_IA_SERPER_GL', 'sn'),
        'hl' => env('BLOGUEUR_IA_SERPER_HL', 'fr'),
    ],

    'llm' => [
        'provider' => env('BLOGUEUR_IA_LLM_PROVIDER', 'anthropic'),
        'api_key' => env('LLM_API_KEY', ''),
        'model' => env('LLM_MODEL', 'claude-sonnet-4-5'),
    ],

    'queue' => [
        // Nom de la connexion/queue Laravel à utiliser pour la génération d'articles.
        // Laisser null pour utiliser la queue par défaut de l'app hôte.
        'connection' => env('BLOGUEUR_IA_QUEUE_CONNECTION', null),
        'queue' => env('BLOGUEUR_IA_QUEUE_NAME', 'blogueur-ia'),
    ],

];