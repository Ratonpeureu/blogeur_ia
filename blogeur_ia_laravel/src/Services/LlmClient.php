<?php

namespace BlogueurIa\Services;

use GuzzleHttp\Client;
use Illuminate\Support\Facades\Config;
use RuntimeException;

class LlmClient
{
    private Client $http;

    public function __construct()
    {
        $this->http = new Client([
            'base_uri' => 'https://api.anthropic.com/v1/',
            'timeout' => 60,
        ]);
    }

    public function chat(string $userMessage, string $systemPrompt = '', float $temperature = 0.7): string
    {
        $apiKey = Config::get('blogueur_ia.llm.api_key');
        $model = Config::get('blogueur_ia.llm.model');

        $resp = $this->http->post('messages', [
            'headers' => [
                'x-api-key' => $apiKey,
                'anthropic-version' => '2023-06-01',
                'content-type' => 'application/json',
            ],
            'json' => [
                'model' => $model,
                'max_tokens' => 4096,
                'system' => $systemPrompt,
                'temperature' => $temperature,
                'messages' => [
                    ['role' => 'user', 'content' => $userMessage],
                ],
            ],
        ]);

        $data = json_decode((string) $resp->getBody(), true);
        $texte = '';
        foreach ($data['content'] ?? [] as $block) {
            if (($block['type'] ?? '') === 'text') {
                $texte .= $block['text'];
            }
        }
        return $texte;
    }

    public function chatJson(string $userMessage, string $systemPrompt = '', float $temperature = 0.7): array
    {
        $texte = $this->chat(
            $userMessage."\n\nRéponds UNIQUEMENT en JSON strict, sans texte autour.",
            $systemPrompt,
            $temperature
        );

        $parsed = $this->extraireJson($texte);
        if ($parsed !== null) {
            return $parsed;
        }

        // Relance de correction plutôt qu'un crash sur un JSON mal formé
        $corrige = $this->chat(
            "Le texte suivant devait être du JSON strict mais ne l'est pas. Renvoie UNIQUEMENT le JSON corrigé, rien d'autre :\n{$texte}",
            $systemPrompt,
            0.2
        );
        $parsedCorrige = $this->extraireJson($corrige);
        if ($parsedCorrige === null) {
            throw new RuntimeException('Impossible de parser la réponse JSON du LLM.');
        }
        return $parsedCorrige;
    }

    private function extraireJson(string $texte): ?array
    {
        $nettoye = preg_replace('/^```json\s*|\s*```$/m', '', trim($texte));
        $decoded = json_decode($nettoye, true);
        return is_array($decoded) ? $decoded : null;
    }
}