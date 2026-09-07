<?php

namespace BlogueurIa;

use Illuminate\Support\ServiceProvider;

class BlogueurIaServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->mergeConfigFrom(__DIR__.'/../config/blogueur_ia.php', 'blogueur_ia');
    }

    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/../database/migrations');

        $this->publishes([
            __DIR__.'/../config/blogueur_ia.php' => config_path('blogueur_ia.php'),
        ], 'blogueur-ia-config');

        // Routes publiques toujours actives ; les routes admin sont volontairement
        // chargées à part (voir README) pour laisser l'app hôte y appliquer son
        // propre middleware d'authentification.
        $this->loadRoutesFrom(__DIR__.'/../routes/public.php');
    }
}