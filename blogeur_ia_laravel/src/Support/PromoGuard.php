<?php

namespace BlogueurIa\Support;

use Illuminate\Support\Facades\Config;

class PromoGuard
{
    public static function enabled(): bool
    {
        return (bool) Config::get('blogueur_ia.promo_guard.enabled', true);
    }

    public static function mentionneMarque(string $sujet): bool
    {
        $sujetLower = mb_strtolower($sujet);
        foreach (Config::get('blogueur_ia.promo_guard.brand_trigger_keywords', []) as $mot) {
            if (str_contains($sujetLower, mb_strtolower($mot))) {
                return true;
            }
        }
        return false;
    }

    public static function compterMentionsPromo(string $texte): int
    {
        $texteLower = mb_strtolower($texte);
        $total = 0;
        foreach (Config::get('blogueur_ia.promo_guard.mentions_interdites', []) as $mention) {
            $total += substr_count($texteLower, mb_strtolower($mention));
        }
        return $total;
    }
}