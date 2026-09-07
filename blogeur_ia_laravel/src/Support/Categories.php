<?php

namespace BlogueurIa\Support;

use Illuminate\Support\Facades\Config;

class Categories
{
    public static function all(): array
    {
        return Config::get('blogueur_ia.categories.ids_labels', []);
    }

    public static function ids(): array
    {
        return array_column(self::all(), 'id');
    }

    public static function isValid(string $id): bool
    {
        return in_array($id, self::ids(), true);
    }

    public static function categorieProduitId(): string
    {
        return Config::get('blogueur_ia.categories.categorie_produit_id', 'produit');
    }

    public static function categorieDefaut(): string
    {
        return Config::get('blogueur_ia.categories.categorie_defaut', 'guide');
    }
}