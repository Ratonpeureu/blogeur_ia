<?php

namespace BlogueurIa\Services;

use GuzzleHttp\Client;
use Illuminate\Support\Facades\Config;
use Throwable;

class SerperClient
{
    private Client $http;

    public function __construct()
    {
        $this->http = new Client(['base_uri' => 'https://google.serper.dev/', 'timeout' => 12]);
    }

    private function post(string $endpoint, array $payload): array
    {
        $apiKey = Config::get('blogueur_ia.serper.api_key');
        if (!$apiKey) {
            return [];
        }
        try {
            $resp = $this->http->post($endpoint, [
                'headers' => ['X-API-KEY' => $apiKey, 'Content-Type' => 'application/json'],
                'json' => $payload,
            ]);
            if ($resp->getStatusCode() !== 200) {
                return [];
            }
            return json_decode((string) $resp->getBody(), true) ?? [];
        } catch (Throwable) {
            return [];
        }
    }

    private function baseParams(): array
    {
        return [
            'gl' => Config::get('blogueur_ia.serper.gl', 'sn'),
            'hl' => Config::get('blogueur_ia.serper.hl', 'fr'),
        ];
    }

    public function search(string $q, int $num = 8): array
    {
        $data = $this->post('search', array_merge(['q' => $q, 'num' => $num], $this->baseParams()));
        return $data['organic'] ?? [];
    }

    public function searchTimeDefine(string $q, int $num = 8, string $tbs = 'qdr:w'): array
    {
        $data = $this->post('search', array_merge(['q' => $q, 'num' => $num, 'tbs' => $tbs], $this->baseParams()));
        return $data['organic'] ?? [];
    }

    public function news(string $q, int $num = 6): array
    {
        $data = $this->post('news', array_merge(['q' => $q, 'num' => $num], $this->baseParams()));
        return $data['news'] ?? [];
    }

    public function images(string $q, int $num = 6): array
    {
        $data = $this->post('images', array_merge(['q' => $q, 'num' => $num], $this->baseParams()));
        return $data['images'] ?? [];
    }

    public function videos(string $q, int $num = 5): array
    {
        $data = $this->post('videos', array_merge(['q' => $q, 'num' => $num], $this->baseParams()));
        return $data['videos'] ?? [];
    }

    public function places(string $q, int $num = 5): array
    {
        $data = $this->post('places', array_merge(['q' => $q, 'num' => $num], $this->baseParams()));
        return $data['places'] ?? [];
    }
}