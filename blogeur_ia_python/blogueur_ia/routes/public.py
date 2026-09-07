from fastapi import APIRouter
from blogueur_ia.blog_service import list_articles_publies, get_article_publie, list_articles_similaires

router = APIRouter(prefix="/api/blog", tags=["blog"])


@router.get("/articles")
async def api_list_articles(categorie: str | None = None, page: int = 1):
    articles = await list_articles_publies(categorie=categorie, limit=20, offset=(page - 1) * 20)
    return [
        {"slug": a.slug, "titre": a.titre, "chapo": a.chapo, "categorie": a.categorie,
         "image": a.image_couverture_url, "date": a.date_publication.isoformat() if a.date_publication else None}
        for a in articles
    ]


@router.get("/articles/{slug}")
async def api_get_article(slug: str):
    a = await get_article_publie(slug)
    return {
        "slug": a.slug, "titre": a.titre, "contenu_html": a.contenu_html, "chapo": a.chapo,
        "auteur": a.auteur, "categorie": a.categorie, "image": a.image_couverture_url,
        "tags": a.tags, "date": a.date_publication.isoformat() if a.date_publication else None,
    }


@router.get("/articles/{slug}/suggestions")
async def api_suggestions_articles(slug: str):
    articles = await list_articles_similaires(slug, limit=4)
    return [
        {"slug": a.slug, "titre": a.titre, "chapo": a.chapo, "categorie": a.categorie,
         "image": a.image_couverture_url, "date": a.date_publication.isoformat() if a.date_publication else None}
        for a in articles
    ]