<?php

namespace BlogueurIa\Services;

use GuzzleHttp\Client;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Storage;
use Throwable;

class MediaStorage
{
    private const EXTENSIONS_AUTORISEES = [
        'image/jpeg' => '.jpg',
        'image/png' => '.png',
        'image/webp' => '.webp',
    ];

    public static function telechargerEtHeberger(?string $url): ?string
    {
        if (!$url) {
            return null;
        }

        $disk = Storage::disk(Config::get('blogueur_ia.storage.disk', 'public'));
        $directory = Config::get('blogueur_ia.storage.directory', 'blog');
        $baseUrl = Config::get('blogueur_ia.storage.base_url');
        $tailleMax = Config::get('blogueur_ia.storage.max_size_mb', 6) * 1024 * 1024;

        try {
            $http = new Client(['timeout' => 12, 'allow_redirects' => true]);
            $resp = $http->get($url, [
                'headers' => ['User-Agent' => 'Mozilla/5.0 (BlogueurIA/1.0)'],
                'http_errors' => false,
            ]);
            if ($resp->getStatusCode() !== 200) {
                return null;
            }

            $contentType = trim(explode(';', $resp->getHeaderLine('Content-Type'))[0] ?? '');
            $ext = self::EXTENSIONS_AUTORISEES[$contentType] ?? self::extFromUrl($url);
            if (!$ext) {
                return null;
            }

            $content = (string) $resp->getBody();
            $taille = strlen($content);
            if ($taille > $tailleMax || $taille < 500) {
                return null;
            }

            $digest = substr(hash('sha256', $content), 0, 24);
            $sousDossier = date('Y/m');
            $nomFichier = "{$digest}{$ext}";
            $cheminRelatif = "{$directory}/{$sousDossier}/{$nomFichier}";

            if (!$disk->exists($cheminRelatif)) {
                $disk->put($cheminRelatif, $content);
            }

            return "{$baseUrl}/{$sousDossier}/{$nomFichier}";
        } catch (Throwable) {
            return null;
        }
    }

    private static function extFromUrl(string $url): ?string
    {
        $path = parse_url($url, PHP_URL_PATH) ?? '';
        if (preg_match('#\.(jpe?g|png|webp)$#i', $path, $m)) {
            $ext = strtolower($m[1]);
            return $ext === 'jpeg' ? '.jpg' : ".{$ext}";
        }
        return null;
    }
}