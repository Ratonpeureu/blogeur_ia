<?php

namespace BlogueurIa\Support;

use Illuminate\Support\Facades\Config;

class FicheTechnique
{
    public static function charger(): string
    {
        $path = Config::get('blogueur_ia.fiche_technique.path');
        if (!$path || !file_exists($path)) {
            return '';
        }
        return file_get_contents($path);
    }
}