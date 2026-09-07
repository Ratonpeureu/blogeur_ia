<?php

namespace BlogueurIa\Services;

use BlogueurIa\Support\Categories;
use BlogueurIa\Support\FicheTechnique;
use BlogueurIa\Support\PromoGuard;
use Illuminate\Support\Facades\Config;
use League\CommonMark\CommonMarkConverter;

class BlogAiService
{
    private const TYPES_BLOC = ['image', 'video', 'carte_lieu', 'article_lie', 'encart_citation_visuelle'];

    public function __construct(
        private LlmClient $llm,
        private SerperClient $serper,
    ) {}

    private function styleHumain(): string
    {
        $brand = Config::get('blogueur_ia.brand');
        $style = Config::get('blogueur_ia.style');
        $interdits = implode(', ', array_map(fn ($m) => "\"{$m}\"", $style['interdits']));

        return <<<TXT

CONSIGNES DE STYLE — impératif :
- Écris comme {$brand['persona_name']}, {$brand['persona_bio']}, pour un contenu éditorial
  et informatif — pas une publicité. Ton direct, centré sur le SUJET, pas sur la marque.
- Varie fortement la longueur des phrases et des paragraphes. Aucune structure répétitive.
- Interdit : {$interdits}, listes à puces systématiques, symétrie parfaite entre sections.
- Pas de méta-commentaire ("cet article va vous présenter"). Entre directement dans le sujet.
- Ancrage sectoriel : {$style['secteur']}, quand c'est pertinent, sans le forcer partout.
- Une seule opinion tranchée assumée par l'auteur dans l'article, pas plus.
- Longueur cible : {$style['min_words']} à {$style['max_words']} mots — pas de remplissage artificiel.

RÈGLE STRICTE SUR LA PROMOTION DE {$brand['name']} :
- Ce contenu est ÉDITORIAL — le lecteur ne doit jamais sentir qu'on lui vend quelque chose.
- Ne mentionne {$brand['name']}, ses fonctionnalités ou son offre QUE SI le sujet en parle
  explicitement et directement.
- Pour un sujet générique, ZÉRO mention de la marque. L'autorité vient de la connaissance
  du sujet, pas du rappel de marque.
- Une signature discrète en fin d'article est acceptable UNE SEULE FOIS maximum.
TXT;
    }

    // ── Étape 1 : brouillon ──────────────────────────────────────────
    public function genererBrouillon(string $promptAdmin, string $categorieIn): array
    {
        $categorie = Categories::isValid($categorieIn) ? $categorieIn : Categories::categorieDefaut();
        $brand = Config::get('blogueur_ia.brand');

        $systemPrompt = "Tu écris à la première personne pour {$brand['persona_name']}, {$brand['persona_bio']}, "
            ."pour un blog d'information sur ".Config::get('blogueur_ia.style.secteur').". "
            ."L'objectif est d'apporter une vraie valeur informative — pas de promouvoir un produit."
            .$this->styleHumain();

        $mentionneMarque = PromoGuard::mentionneMarque($promptAdmin);
        $concerneMarque = $categorie === Categories::categorieProduitId() || $mentionneMarque;

        if ($concerneMarque) {
            $fiche = FicheTechnique::charger();
            if ($fiche) {
                $systemPrompt .= "\n\nCe sujet concerne explicitement {$brand['name']}. Voici la fiche "
                    ."technique officielle, seule source de vérité autorisée — n'invente et ne suppose "
                    ."jamais un détail absent de cette fiche :\n{$fiche}";
            }
        }

        $userPrompt = <<<TXT
Sujet demandé : {$promptAdmin}
Catégorie : {$categorie}

Rédige l'article complet en Markdown (titres ##/###, paragraphes). Traite le sujet pour
lui-même, sans le ramener artificiellement à un produit sauf si le sujet l'exige.

Réponds UNIQUEMENT en JSON strict :
{
  "titre": "...",
  "chapo": "...(160 caractères max, accrocheur)",
  "contenu_markdown": "...",
  "mots_cles_utilises": ["..."]
}
TXT;

        $resultat = $this->llm->chatJson($userPrompt, $systemPrompt, Config::get('blogueur_ia.style.temperature_redaction'));

        if (
            PromoGuard::enabled()
            && !$concerneMarque
            && PromoGuard::compterMentionsPromo($resultat['contenu_markdown'] ?? '') > 0
        ) {
            $resultat = $this->llm->chatJson(
                $userPrompt."\n\nATTENTION : ta première tentative mentionnait {$brand['name']} alors "
                    ."que ce sujet est générique. Réécris entièrement sans AUCUNE mention de la marque "
                    ."ou de formulation promotionnelle.",
                $systemPrompt,
                Config::get('blogueur_ia.style.temperature_reecriture')
            );
        }

        return $resultat;
    }

    // ── Étape 2 : plan de contenu mixte ───────────────────────────────
    public function planifierContenu(string $contenuMarkdown, string $titre): array
    {
        $systemPrompt = 'Tu es directeur de contenu pour un blog professionnel bien référencé. Tu décides, '
            .'pour CET article précis, quels blocs multimédias inclure. Rien n\'est figé : varie '
            .'selon ce que l\'article justifie réellement.';

        $typesJson = json_encode(self::TYPES_BLOC);

        $userPrompt = <<<TXT
Titre : {$titre}
Article (Markdown) :
{$contenuMarkdown}

Types de blocs disponibles : {$typesJson}

Règles :
- "image" et "encart_citation_visuelle" : illustrent un propos précis d'un paragraphe.
- "video" : uniquement si le sujet s'y prête vraiment.
- "carte_lieu" : uniquement si l'article mentionne un lieu concret.
- "article_lie" : renvoie vers un article externe complémentaire, présenté "à lire aussi".
- Entre 2 et 6 blocs au total, jamais un nombre fixe d'un article à l'autre.
- Pour chaque bloc : ancrage = 6-8 premiers mots exacts du paragraphe visé (ou "DEBUT").
- "requete_recherche" : requête concrète adaptée au type.

Réponds UNIQUEMENT en JSON strict :
{"blocs": [{"id": "b1", "type": "image", "ancrage": "DEBUT", "requete_recherche": "...", "legende": "..."}]}
TXT;

        $result = $this->llm->chatJson($userPrompt, $systemPrompt, 0.8);
        return array_slice($result['blocs'] ?? [], 0, 6);
    }

    public function resoudreBloc(array $bloc): ?array
    {
        $t = $bloc['type'];
        $q = $bloc['requete_recherche'] ?? '';

        if (in_array($t, ['image', 'encart_citation_visuelle'], true)) {
            foreach ($this->serper->images($q, 5) as $c) {
                $urlSource = $c['imageUrl'] ?? null;
                if (!$urlSource) {
                    continue;
                }
                $urlHebergee = MediaStorage::telechargerEtHeberger($urlSource);
                if ($urlHebergee) {
                    return ['type' => $t, 'url' => $urlHebergee, 'credit_lien' => $c['link'] ?? ''];
                }
            }
            return null;
        }

        if ($t === 'video') {
            foreach ($this->serper->videos($q, 5) as $c) {
                $embed = EmbedHelpers::extraireEmbedVideo($c['link'] ?? '');
                if ($embed) {
                    return [
                        'type' => 'video', 'embed_url' => $embed['embed_url'],
                        'titre_video' => $c['title'] ?? '', 'source' => $c['channel'] ?? $c['source'] ?? '',
                    ];
                }
            }
            return null;
        }

        if ($t === 'carte_lieu') {
            foreach ($this->serper->places($q, 3) as $c) {
                if (!empty($c['latitude']) && !empty($c['longitude'])) {
                    return [
                        'type' => 'carte_lieu',
                        'embed_url' => EmbedHelpers::embedMaps($c['latitude'], $c['longitude']),
                        'nom_lieu' => $c['title'] ?? '', 'adresse' => $c['address'] ?? '',
                    ];
                }
            }
            return null;
        }

        if ($t === 'article_lie') {
            $candidats = $this->serper->news($q, 5);
            if (empty($candidats)) {
                $candidats = $this->serper->search($q, 5);
            }
            foreach ($candidats as $c) {
                $url = $c['link'] ?? null;
                if (!$url || !EmbedHelpers::urlEstValide($url)) {
                    continue;
                }
                $imageHebergee = !empty($c['imageUrl']) ? MediaStorage::telechargerEtHeberger($c['imageUrl']) : null;
                return [
                    'type' => 'article_lie', 'url' => $url, 'titre_externe' => $c['title'] ?? '',
                    'extrait' => mb_substr($c['snippet'] ?? '', 0, 180),
                    'source' => $c['source'] ?? parse_url($url, PHP_URL_HOST), 'image' => $imageHebergee,
                ];
            }
            return null;
        }

        return null;
    }

    public function resoudreTousLesBlocs(array $blocs): array
    {
        $resolus = [];
        foreach ($blocs as $bloc) {
            $contenu = $this->resoudreBloc($bloc);
            if ($contenu) {
                $contenu['legende'] = $bloc['legende'] ?? '';
                $resolus[$bloc['id']] = $contenu;
            }
        }
        return $resolus;
    }

    // ── Étape 3 : backlinks SEO ───────────────────────────────────────
    public function choisirRequetesRecherche(string $titre, string $contenuMarkdown): array
    {
        $prompt = <<<TXT
Titre : {$titre}
Article :
{$contenuMarkdown}

Propose 4 à 6 requêtes pour trouver de VRAIES sources externes crédibles qui appuient
les arguments de cet article. Requêtes précises, pas vagues.
Réponds UNIQUEMENT en JSON : {"requetes": ["..."]}
TXT;
        $result = $this->llm->chatJson($prompt, 'Tu es un assistant de recherche documentaire rigoureux.', 0.3);
        return $result['requetes'] ?? [];
    }

    public function rechercherBacklinks(array $requetes): array
    {
        $candidats = [];
        foreach ($requetes as $q) {
            $candidats = array_merge($candidats, $this->serper->search($q, 5), $this->serper->news($q, 3));
        }
        $valides = [];
        foreach ($candidats as $c) {
            $url = $c['link'] ?? null;
            if ($url && EmbedHelpers::urlEstValide($url)) {
                $valides[] = ['url' => $url, 'titre' => $c['title'] ?? '', 'extrait' => $c['snippet'] ?? ''];
            }
        }
        return $valides;
    }

    // ── Étape 4 : réécriture avec liens + mots-clés ───────────────────
    public function reecrireAvecLiens(string $titre, string $contenuMarkdown, array $sources): array
    {
        if (empty($sources)) {
            return [
                'contenu_markdown_final' => $contenuMarkdown, 'liens_utilises' => [],
                'mots_cles_seo_utilises' => [], 'meta_title' => mb_substr($titre, 0, 60), 'meta_description' => '',
            ];
        }

        $sourcesTxt = implode("\n", array_map(
            fn ($s) => "- {$s['titre']} — {$s['url']} — ".($s['extrait'] ?? ''),
            $sources
        ));

        $systemPrompt = "Tu réécris l'article en y intégrant, naturellement, entre 5 et 10 liens sortants "
            ."choisis EXCLUSIVEMENT dans la liste fournie — n'invente JAMAIS une URL."
            .$this->styleHumain();

        $pool = Config::get('blogueur_ia.mots_cles_seo.pool', []);
        shuffle($pool);
        $motsCles = implode(', ', array_slice($pool, 0, 10));

        $userPrompt = <<<TXT
Titre : {$titre}

Article original (Markdown) :
{$contenuMarkdown}

Sources réelles disponibles :
{$sourcesTxt}

Réécris en intégrant les liens pertinents en Markdown ([texte](url)) pour appuyer des
arguments — jamais en liste à la fin. Intègre aussi naturellement quelques mots-clés parmi :
{$motsCles}

Réponds UNIQUEMENT en JSON strict :
{"contenu_markdown_final": "...", "liens_utilises": ["..."], "mots_cles_seo_utilises": ["..."],
  "meta_title": "...(60 caractères max)", "meta_description": "...(155 caractères max)"}
TXT;

        return $this->llm->chatJson($userPrompt, $systemPrompt, Config::get('blogueur_ia.style.temperature_reecriture'));
    }

    // ── Étape 5 : assemblage HTML ──────────────────────────────────────
    private function htmlImage(array $b): string
    {
        $legende = $b['legende'] ?? '';
        return "<figure class=\"article-img\"><img src=\"{$b['url']}\" alt=\"{$legende}\" loading=\"lazy\"/><figcaption>{$legende}</figcaption></figure>";
    }

    private function htmlVideo(array $b): string
    {
        $caption = $b['legende'] ?: ($b['titre_video'] ?? '');
        $captionHtml = $caption ? "<p class=\"video-caption\">{$caption}</p>" : '';
        return "<div class=\"article-video-embed\"><iframe src=\"{$b['embed_url']}\" title=\"".($b['titre_video'] ?? '')."\" frameborder=\"0\" allowfullscreen loading=\"lazy\"></iframe>{$captionHtml}</div>";
    }

    private function htmlCarte(array $b): string
    {
        $adresse = !empty($b['adresse']) ? "<p class=\"map-address\">".($b['nom_lieu'] ?? '')." — {$b['adresse']}</p>" : '';
        return "<div class=\"article-map-embed\"><iframe src=\"{$b['embed_url']}\" frameborder=\"0\" loading=\"lazy\" allowfullscreen></iframe>{$adresse}</div>";
    }

    private function htmlArticleLie(array $b): string
    {
        $img = !empty($b['image']) ? "<img src=\"{$b['image']}\" alt=\"\" loading=\"lazy\"/>" : '';
        return "<a class=\"article-related-card\" href=\"{$b['url']}\" target=\"_blank\" rel=\"noopener noreferrer\">{$img}<div class=\"related-card-body\"><span class=\"related-tag\">À lire aussi</span><h4>".($b['titre_externe'] ?? '')."</h4><p>".($b['extrait'] ?? '')."</p><span class=\"related-source\">".($b['source'] ?? '')."</span></div></a>";
    }

    private function renderer(string $type): ?callable
    {
        return match ($type) {
            'image', 'encart_citation_visuelle' => fn ($b) => $this->htmlImage($b),
            'video' => fn ($b) => $this->htmlVideo($b),
            'carte_lieu' => fn ($b) => $this->htmlCarte($b),
            'article_lie' => fn ($b) => $this->htmlArticleLie($b),
            default => null,
        };
    }

    public function assemblerHtml(string $contenuMarkdown, array $blocs, array $resolus): string
    {
        $contenu = $contenuMarkdown;
        $heroBloc = null;
        foreach ($blocs as $bloc) {
            if (($bloc['ancrage'] ?? null) === 'DEBUT' && isset($resolus[$bloc['id']])) {
                $heroBloc = $bloc;
                break;
            }
        }

        foreach ($blocs as $bloc) {
            if ($bloc === $heroBloc || !isset($resolus[$bloc['id']])) {
                continue;
            }
            $data = $resolus[$bloc['id']];
            $renderer = $this->renderer($data['type']);
            if (!$renderer) {
                continue;
            }
            $htmlBloc = $renderer($data);
            $ancrage = $bloc['ancrage'] ?? '';
            if ($ancrage && str_contains($contenu, $ancrage)) {
                $idx = strpos($contenu, $ancrage);
                $finIdx = strpos($contenu, "\n", $idx);
                $fin = $finIdx !== false ? $finIdx : strlen($contenu);
                $contenu = substr($contenu, 0, $fin)."\n\n{$htmlBloc}\n\n".substr($contenu, $fin);
            } else {
                $contenu .= "\n\n{$htmlBloc}\n";
            }
        }

        $converter = new CommonMarkConverter();
        $htmlCorps = (string) $converter->convert($contenu);

        if ($heroBloc) {
            $data = $resolus[$heroBloc['id']];
            $renderer = $this->renderer($data['type']);
            if ($renderer) {
                $htmlCorps = $renderer($data).$htmlCorps;
            }
        }

        return $htmlCorps;
    }

    // ── Orchestration complète ────────────────────────────────────────
    public function genererArticleIa(string $promptAdmin, string $categorie): array
    {
        $brouillon = $this->genererBrouillon($promptAdmin, $categorie);
        $titre = $brouillon['titre'];
        $contenuMd = $brouillon['contenu_markdown'];

        $blocs = $this->planifierContenu($contenuMd, $titre);
        $resolus = $this->resoudreTousLesBlocs($blocs);

        $requetes = $this->choisirRequetesRecherche($titre, $contenuMd);
        $sources = !empty($requetes) ? $this->rechercherBacklinks($requetes) : [];

        $reecriture = $this->reecrireAvecLiens($titre, $contenuMd, $sources);
        $contenuHtml = $this->assemblerHtml($reecriture['contenu_markdown_final'], $blocs, $resolus);

        $heroBloc = null;
        foreach ($blocs as $bloc) {
            if (($bloc['ancrage'] ?? null) === 'DEBUT' && isset($resolus[$bloc['id']])) {
                $heroBloc = $bloc;
                break;
            }
        }
        $imageCouverture = $heroBloc ? ($resolus[$heroBloc['id']]['url'] ?? null) : null;
        if (!$imageCouverture) {
            foreach ($resolus as $data) {
                if (!empty($data['url'])) {
                    $imageCouverture = $data['url'];
                    break;
                }
            }
        }

        return [
            'titre' => $titre,
            'chapo' => mb_substr($brouillon['chapo'] ?? '', 0, 160),
            'contenu_html' => $contenuHtml,
            'image_couverture_url' => $imageCouverture,
            'meta_title' => $reecriture['meta_title'] ?? null,
            'meta_description' => $reecriture['meta_description'] ?? null,
            'liens_externes' => $reecriture['liens_utilises'] ?? [],
            'mots_cles_seo' => $reecriture['mots_cles_seo_utilises'] ?? [],
            'blocs_media' => collect($resolus)->map(fn ($v, $k) => ['id' => $k, 'type' => $v['type']])->values()->all(),
            'categorie' => $categorie,
        ];
    }
}