<?php

namespace BlogueurIa\Services;

use GuzzleHttp\Client;
use Throwable;

class EmbedHelpers
{
    private const YOUTUBE_PATTERNS = [
        '#youtube\.com/watch\?v=([\w-]{11})#',
        '#youtu\.be/([\w-]{11})#',
        '#youtube\.com/embed/([\w-]{11})#',
    ];
    private const VIMEO_PATTERN = '#vimeo\.com/(\d+)#';

    public static function extraireEmbedVideo(string $url): ?array
    {
        foreach (self::YOUTUBE_PATTERNS as $pattern) {
            if (preg_match($pattern, $url, $m)) {
                return ['provider' => 'youtube', 'embed_url' => "https://www.youtube.com/embed/{$m[1]}"];
            }
        }
        if (preg_match(self::VIMEO_PATTERN, $url, $m)) {
            return ['provider' => 'vimeo', 'embed_url' => "https://player.vimeo.com/video/{$m[1]}"];
        }
        return null;
    }

    public static function urlEstValide(?string $url): bool
    {
        if (!$url) {
            return false;
        }
        $http = new Client(['timeout' => 8, 'allow_redirects' => true, 'http_errors' => false]);
        try {
            $resp = $http->head($url);
            if ($resp->getStatusCode() >= 400) {
                $resp = $http->get($url);
            }
            return $resp->getStatusCode() < 400;
        } catch (Throwable) {
            return false;
        }
    }

    public static function embedMaps(float $lat, float $lng, int $zoom = 15): string
    {
        return "https://www.google.com/maps?q={$lat},{$lng}&z={$zoom}&output=embed&hl=fr";
    }
}