import os
import re
import random
import unicodedata
import markdown as md_lib

from blogueur_ia.config import settings
from blogueur_ia.categories import CATEGORIES_BLOG_IDS, CATEGORIE_PRODUIT_ID, CATEGORIE_DEFAUT
from blogueur_ia.llm_client import LLMClient
from blogueur_ia.serper_client import serper_search, serper_news, serper_images, serper_videos, serper_places
from blogueur_ia.embed_helpers import extraire_embed_video, url_est_valide, embed_maps
from blogueur_ia.media_storage import telecharger_et_heberger_image

TYPES_BLOC = ["image", "video", "carte_lieu", "article_lie", "encart_citation_visuelle"]


def _style_humain() -> str:
    interdits = ", ".join(f'"{m}"' for m in settings.interdits)
    return f"""
CONSIGNES DE STYLE — impératif :
- Écris comme {settings.persona_name}, {settings.persona_bio}, pour un contenu éditorial et
  informatif — pas une publicité. Ton direct, centré sur le SUJET, pas sur la marque.
- Varie fortement la longueur des phrases et des paragraphes. Aucune structure répétitive.
- Interdit : {interdits}, listes à puces systématiques, symétrie parfaite entre sections.
- Pas de méta-commentaire ("cet article va vous présenter"). Entre directement dans le sujet.
- Ancrage sectoriel : {settings.secteur}, quand c'est pertinent, sans le forcer partout.
- Une seule opinion tranchée assumée par l'auteur dans l'article, pas plus.
- Longueur cible : {settings.min_words} à {settings.max_words} mots — pas de remplissage artificiel.

RÈGLE STRICTE SUR LA PROMOTION DE {settings.brand_name.upper()} :
- Ce contenu est ÉDITORIAL — le lecteur ne doit jamais sentir qu'on lui vend quelque chose.
- Ne mentionne {settings.brand_name}, ses fonctionnalités ou son offre QUE SI le sujet en
  parle explicitement et directement.
- Pour un sujet générique, ZÉRO mention de la marque. L'autorité vient de la connaissance
  du sujet, pas du rappel de marque.
- Une signature discrète en fin d'article est acceptable UNE SEULE FOIS maximum.
"""


def _charger_fiche_technique() -> str:
    if not settings.fiche_technique_path or not os.path.exists(settings.fiche_technique_path):
        return ""
    with open(settings.fiche_technique_path, "r", encoding="utf-8") as f:
        return f.read()


def _compter_mentions_promo(texte: str) -> int:
    texte_lower = texte.lower()
    return sum(texte_lower.count(m) for m in settings.mentions_interdites)


# ── Étape 1 : brouillon ──────────────────────────────────────────
def generer_brouillon(prompt_admin: str, categorie: str, client: LLMClient) -> dict:
    if categorie not in CATEGORIES_BLOG_IDS:
        categorie = CATEGORIE_DEFAUT

    system_prompt = (
        f"Tu écris à la première personne pour {settings.persona_name}, {settings.persona_bio}, "
        f"pour un blog d'information sur {settings.secteur}. L'objectif est d'apporter une vraie "
        f"valeur informative — pas de promouvoir un produit."
        + _style_humain()
    )

    sujet_lower = prompt_admin.lower()
    mentionne_marque = any(mot in sujet_lower for mot in settings.brand_trigger_keywords)
    concerne_marque = categorie == CATEGORIE_PRODUIT_ID or mentionne_marque

    if concerne_marque:
        fiche = _charger_fiche_technique()
        if fiche:
            system_prompt += (
                f"\n\nCe sujet concerne explicitement {settings.brand_name}. Voici la fiche "
                f"technique officielle, seule source de vérité autorisée — n'invente et ne "
                f"suppose jamais un détail absent de cette fiche :\n{fiche}"
            )

    user_prompt = f"""Sujet demandé : {prompt_admin}
Catégorie : {categorie}

Rédige l'article complet en Markdown (titres ##/###, paragraphes). Traite le sujet pour
lui-même, sans le ramener artificiellement à un produit sauf si le sujet l'exige.

Réponds UNIQUEMENT en JSON strict :
{{
  "titre": "...",
  "chapo": "...(160 caractères max, accrocheur)",
  "contenu_markdown": "...",
  "mots_cles_utilises": ["..."]
}}"""
    resultat = client.chat_json(user_message=user_prompt, system_prompt=system_prompt,
                                 temperature=settings.temperature_redaction)

    if settings.promo_guard_enabled and not concerne_marque and _compter_mentions_promo(resultat.get("contenu_markdown", "")) > 0:
        resultat = client.chat_json(
            user_message=user_prompt + (
                f"\n\nATTENTION : ta première tentative mentionnait {settings.brand_name} alors "
                f"que ce sujet est générique. Réécris entièrement sans AUCUNE mention de la marque "
                f"ou de formulation promotionnelle."
            ),
            system_prompt=system_prompt, temperature=settings.temperature_reecriture,
        )
    return resultat


# ── Étape 2 : plan de contenu mixte ───────────────────────────────
def planifier_contenu(contenu_markdown: str, titre: str, client: LLMClient) -> list[dict]:
    system_prompt = (
        "Tu es directeur de contenu pour un blog professionnel bien référencé. Tu décides, "
        "pour CET article précis, quels blocs multimédias inclure. Rien n'est figé : varie "
        "selon ce que l'article justifie réellement."
    )
    user_prompt = f"""Titre : {titre}
Article (Markdown) :
{contenu_markdown}

Types de blocs disponibles : {TYPES_BLOC}

Règles :
- "image" et "encart_citation_visuelle" : illustrent un propos précis d'un paragraphe.
- "video" : uniquement si le sujet s'y prête vraiment.
- "carte_lieu" : uniquement si l'article mentionne un lieu concret.
- "article_lie" : renvoie vers un article externe complémentaire, présenté "à lire aussi".
- Entre 2 et 6 blocs au total, jamais un nombre fixe d'un article à l'autre.
- Pour chaque bloc : ancrage = 6-8 premiers mots exacts du paragraphe visé (ou "DEBUT").
- "requete_recherche" : requête concrète adaptée au type.

Réponds UNIQUEMENT en JSON strict :
{{"blocs": [{{"id": "b1", "type": "image", "ancrage": "DEBUT", "requete_recherche": "...", "legende": "..."}}]}}"""
    result = client.chat_json(user_message=user_prompt, system_prompt=system_prompt, temperature=0.8)
    return result.get("blocs", [])[:6]


async def resoudre_bloc(bloc: dict) -> dict | None:
    t = bloc["type"]
    q = bloc.get("requete_recherche", "")

    if t in ("image", "encart_citation_visuelle"):
        candidats = await serper_images(q, num=5)
        for c in candidats:
            url_source = c.get("imageUrl")
            if not url_source:
                continue
            url_hebergee = await telecharger_et_heberger_image(url_source)
            if url_hebergee:
                return {"type": t, "url": url_hebergee, "credit_lien": c.get("link", "")}
        return None

    if t == "video":
        for c in await serper_videos(q, num=5):
            embed = extraire_embed_video(c.get("link", ""))
            if embed:
                return {"type": "video", "embed_url": embed["embed_url"],
                        "titre_video": c.get("title", ""), "source": c.get("channel") or c.get("source", "")}
        return None

    if t == "carte_lieu":
        for c in await serper_places(q, num=3):
            lat, lng = c.get("latitude"), c.get("longitude")
            if lat and lng:
                return {"type": "carte_lieu", "embed_url": embed_maps(lat, lng),
                        "nom_lieu": c.get("title", ""), "adresse": c.get("address", "")}
        return None

    if t == "article_lie":
        candidats = await serper_news(q, num=5) or await serper_search(q, num=5)
        for c in candidats:
            url = c.get("link")
            if not (url and await url_est_valide(url)):
                continue
            image_hebergee = await telecharger_et_heberger_image(c["imageUrl"]) if c.get("imageUrl") else None
            return {"type": "article_lie", "url": url, "titre_externe": c.get("title", ""),
                    "extrait": (c.get("snippet") or "")[:180],
                    "source": c.get("source", "") or url.split("/")[2], "image": image_hebergee}
        return None

    return None


async def resoudre_tous_les_blocs(blocs: list[dict]) -> dict:
    resolus = {}
    for bloc in blocs:
        contenu = await resoudre_bloc(bloc)
        if contenu:
            contenu["legende"] = bloc.get("legende", "")
            resolus[bloc["id"]] = contenu
    return resolus


# ── Étape 3 : backlinks SEO ───────────────────────────────────────
def choisir_requetes_recherche(titre: str, contenu_markdown: str, client: LLMClient) -> list[str]:
    prompt = f"""Titre : {titre}
Article :
{contenu_markdown}

Propose 4 à 6 requêtes pour trouver de VRAIES sources externes crédibles qui appuient
les arguments de cet article. Requêtes précises, pas vagues.
Réponds UNIQUEMENT en JSON : {{"requetes": ["..."]}}"""
    result = client.chat_json(user_message=prompt, system_prompt="Tu es un assistant de recherche documentaire rigoureux.", temperature=0.3)
    return result.get("requetes", [])


async def rechercher_backlinks(requetes: list[str]) -> list[dict]:
    candidats = []
    for q in requetes:
        candidats += await serper_search(q, num=5)
        candidats += await serper_news(q, num=3)
    valides = []
    for c in candidats:
        url = c.get("link")
        if url and await url_est_valide(url):
            valides.append({"url": url, "titre": c.get("title", ""), "extrait": c.get("snippet", "")})
    return valides


# ── Étape 4 : réécriture avec liens + mots-clés ───────────────────
def reecrire_avec_liens(titre: str, contenu_markdown: str, sources: list[dict], client: LLMClient) -> dict:
    if not sources:
        return {"contenu_markdown_final": contenu_markdown, "liens_utilises": [],
                "mots_cles_seo_utilises": [], "meta_title": titre[:60], "meta_description": ""}

    sources_txt = "\n".join(f"- {s['titre']} — {s['url']} — {s.get('extrait','')}" for s in sources)
    system_prompt = (
        "Tu réécris l'article en y intégrant, naturellement, entre 5 et 10 liens sortants "
        "choisis EXCLUSIVEMENT dans la liste fournie — n'invente JAMAIS une URL."
        + _style_humain()
    )
    mots_cles = random.sample(settings.mots_cles_pool, k=min(10, len(settings.mots_cles_pool))) if settings.mots_cles_pool else []
    user_prompt = f"""Titre : {titre}

Article original (Markdown) :
{contenu_markdown}

Sources réelles disponibles :
{sources_txt}

Réécris en intégrant les liens pertinents en Markdown ([texte](url)) pour appuyer des
arguments — jamais en liste à la fin. Intègre aussi naturellement quelques mots-clés parmi :
{", ".join(mots_cles)}

Réponds UNIQUEMENT en JSON strict :
{{"contenu_markdown_final": "...", "liens_utilises": ["..."], "mots_cles_seo_utilises": ["..."],
  "meta_title": "...(60 caractères max)", "meta_description": "...(155 caractères max)"}}"""
    return client.chat_json(user_message=user_prompt, system_prompt=system_prompt, temperature=settings.temperature_reecriture)


# ── Étape 5 : assemblage HTML ──────────────────────────────────────
def _html_image(b): return (f'<figure class="article-img"><img src="{b["url"]}" alt="{b.get("legende","")}" loading="lazy"/>'
                             f'<figcaption>{b.get("legende","")}</figcaption></figure>')
def _html_video(b): return (f'<div class="article-video-embed"><iframe src="{b["embed_url"]}" title="{b.get("titre_video","")}" '
                             f'frameborder="0" allowfullscreen loading="lazy"></iframe>'
                             + (f'<p class="video-caption">{b.get("legende") or b.get("titre_video","")}</p>' if b.get("legende") or b.get("titre_video") else "") + '</div>')
def _html_carte(b):
    adresse = f'<p class="map-address">{b.get("nom_lieu","")} — {b.get("adresse","")}</p>' if b.get("adresse") else ""
    return f'<div class="article-map-embed"><iframe src="{b["embed_url"]}" frameborder="0" loading="lazy" allowfullscreen></iframe>{adresse}</div>'
def _html_article_lie(b):
    img = f'<img src="{b["image"]}" alt="" loading="lazy"/>' if b.get("image") else ""
    return (f'<a class="article-related-card" href="{b["url"]}" target="_blank" rel="noopener noreferrer">{img}'
            f'<div class="related-card-body"><span class="related-tag">À lire aussi</span>'
            f'<h4>{b.get("titre_externe","")}</h4><p>{b.get("extrait","")}</p>'
            f'<span class="related-source">{b.get("source","")}</span></div></a>')

RENDERERS = {"image": _html_image, "encart_citation_visuelle": _html_image,
             "video": _html_video, "carte_lieu": _html_carte, "article_lie": _html_article_lie}


def assembler_html(contenu_markdown: str, blocs: list[dict], resolus: dict) -> str:
    contenu = contenu_markdown
    hero_bloc = next((b for b in blocs if b.get("ancrage") == "DEBUT" and b["id"] in resolus), None)

    for bloc in blocs:
        if bloc is hero_bloc or bloc["id"] not in resolus:
            continue
        data = resolus[bloc["id"]]
        renderer = RENDERERS.get(data["type"])
        if not renderer:
            continue
        html_bloc = renderer(data)
        ancrage = bloc.get("ancrage", "")
        if ancrage and ancrage in contenu:
            idx = contenu.index(ancrage)
            fin = contenu.index("\n", idx) if "\n" in contenu[idx:] else len(contenu)
            contenu = contenu[:fin] + f"\n\n{html_bloc}\n\n" + contenu[fin:]
        else:
            contenu += f"\n\n{html_bloc}\n"

    html_corps = md_lib.markdown(contenu, extensions=["extra"])
    if hero_bloc:
        renderer = RENDERERS.get(resolus[hero_bloc["id"]]["type"])
        if renderer:
            html_corps = renderer(resolus[hero_bloc["id"]]) + html_corps
    return html_corps


def run_async(coro):
    import asyncio
    return asyncio.get_event_loop().run_until_complete(coro)


def generer_article_ia(prompt_admin: str, categorie: str, auto_publish: bool) -> dict:
    client = LLMClient()

    brouillon = generer_brouillon(prompt_admin, categorie, client)
    titre, contenu_md = brouillon["titre"], brouillon["contenu_markdown"]

    blocs = planifier_contenu(contenu_md, titre, client)
    resolus = run_async(resoudre_tous_les_blocs(blocs))

    requetes = choisir_requetes_recherche(titre, contenu_md, client)
    sources = run_async(rechercher_backlinks(requetes)) if requetes else []

    reecriture = reecrire_avec_liens(titre, contenu_md, sources, client)
    contenu_html = assembler_html(reecriture["contenu_markdown_final"], blocs, resolus)

    hero_bloc = next((b for b in blocs if b.get("ancrage") == "DEBUT" and b["id"] in resolus), None)
    image_couverture = resolus[hero_bloc["id"]].get("url") if hero_bloc else None
    if not image_couverture:
        for data in resolus.values():
            if data.get("url"):
                image_couverture = data["url"]
                break

    return {
        "titre": titre,
        "chapo": brouillon.get("chapo", "")[:160],
        "contenu_html": contenu_html,
        "image_couverture_url": image_couverture,
        "meta_title": reecriture.get("meta_title"),
        "meta_description": reecriture.get("meta_description"),
        "liens_externes": reecriture.get("liens_utilises", []),
        "mots_cles_seo": reecriture.get("mots_cles_seo_utilises", []),
        "blocs_media": [{"id": k, "type": v["type"]} for k, v in resolus.items()],
        "categorie": categorie,
    }