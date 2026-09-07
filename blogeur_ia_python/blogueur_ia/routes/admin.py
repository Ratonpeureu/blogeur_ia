"""Router admin à auth pluggable — vous fournissez votre propre dépendance
d'authentification (celle de votre app), ce module ne présuppose rien."""
from typing import Callable, Optional
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from blogueur_ia.categories import CATEGORIES_BLOG
from blogueur_ia.blog_auto_service import creer_brouillon_depuis_sortie
from blogueur_ia.blog_service import supprimer_article, list_articles_admin


class GenererArticleBody(BaseModel):
    prompt: str
    categorie: str = "guide"
    auto_publish: bool = True


class DraftFromReleaseBody(BaseModel):
    titre: str
    description: str
    categorie: Optional[str] = None


def build_admin_router(auth_dependency: Optional[Callable] = None, prefix: str = "/admin") -> APIRouter:
    """auth_dependency : votre Depends(get_current_admin) habituel. Si None, les
    routes sont exposées SANS auth — à réserver au développement local uniquement."""
    deps = [Depends(auth_dependency)] if auth_dependency else []
    router = APIRouter(prefix=prefix, tags=["blog-admin"], dependencies=deps)

    @router.get("/blog/categories")
    async def admin_categories_blog():
        return CATEGORIES_BLOG

    @router.get("/blog")
    async def admin_list_articles(statut: str | None = None, page: int = 1):
        articles = await list_articles_admin(statut=statut, limit=20, offset=(page - 1) * 20)
        return [
            {"slug": a.slug, "titre": a.titre, "chapo": a.chapo, "categorie": a.categorie,
             "statut": a.statut, "source": a.source, "image": a.image_couverture_url,
             "date": a.date_publication.isoformat() if a.date_publication else None,
             "created_at": a.created_at.isoformat()}
            for a in articles
        ]

    @router.post("/blog/draft-from-release")
    async def draft_from_release(body: DraftFromReleaseBody):
        await creer_brouillon_depuis_sortie(body.titre, body.description, body.categorie)
        return {"status": "brouillon créé — à relire et publier manuellement"}

    @router.post("/blog/generate")
    async def admin_generer_article(body: GenererArticleBody):
        from blogueur_ia.tasks import generate_blog_article_task
        task = generate_blog_article_task.delay(
            prompt_admin=body.prompt, categorie=body.categorie, auto_publish=body.auto_publish,
        )
        return {"task_id": task.id, "status": "génération lancée"}

    @router.delete("/blog/{slug}")
    async def admin_supprimer_article(slug: str):
        await supprimer_article(slug)
        return {"status": "article supprimé"}

    return router